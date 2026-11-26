// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiErrorClass } from '@/lib/api-client'

import { AddMemberDialog } from './add-member-dialog'

const h = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}))

vi.mock('sonner', () => ({ toast: { error: h.toastError, success: h.toastSuccess } }))
vi.mock('@/api/members', () => ({
  useAddMember: () => ({ isPending: false, mutateAsync: h.mutateAsync }),
}))

beforeEach(() => {
  h.mutateAsync.mockReset().mockResolvedValue({ id: 'u9', username: 'ada' })
})

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  if (typeof (Element.prototype as { hasPointerCapture?: unknown }).hasPointerCapture !== 'function') {
    Element.prototype.hasPointerCapture = vi.fn<() => boolean>(() => false)
    Element.prototype.releasePointerCapture = vi.fn<() => void>()
    Element.prototype.setPointerCapture = vi.fn<() => void>()
  }
  Element.prototype.scrollIntoView = vi.fn<() => void>()
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

function renderDialog() {
  const onOpenChange = vi.fn<(open: boolean) => void>()
  render(
    <AddMemberDialog
      open
      onOpenChange={onOpenChange}
    />,
  )
  return { onOpenChange }
}

describe('addMemberDialog', () => {
  it('adds an existing account by exact username with the default user role', async () => {
    const { onOpenChange } = renderDialog()

    fireEvent.change(screen.getByLabelText(/Username/), { target: { value: '  ada ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    await waitFor(() => expect(h.mutateAsync).toHaveBeenCalledWith({ roles: ['user'], username: 'ada' }))
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(h.toastSuccess).toHaveBeenCalled()
  })

  it('member_add_shows_account_not_found_on_404', async () => {
    h.mutateAsync.mockRejectedValue(
      new ApiErrorClass('Not found', { code: 'account_not_found', status: 404 }),
    )
    const { onOpenChange } = renderDialog()

    fireEvent.change(screen.getByLabelText(/Username/), { target: { value: 'ghost' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    // 提示落在用户名字段下(不是一闪而过的 toast),弹窗留着让人改用户名重试。
    expect(await screen.findByText('No account with this username')).toBeTruthy()
    expect(screen.getByLabelText(/Username/).getAttribute('aria-invalid')).toBe('true')
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
    expect(h.toastError).not.toHaveBeenCalled()

    // 改了用户名,这条服务端提示就该消失。
    fireEvent.change(screen.getByLabelText(/Username/), { target: { value: 'ghost2' } })
    await waitFor(() => expect(screen.queryByText('No account with this username')).toBeNull())
  })

  it('sends other 404s and 409s to the generic error toast', async () => {
    const { onOpenChange } = renderDialog()

    // 409(已是成员 / 冲突)不落字段,走通用错误
    h.mutateAsync.mockRejectedValueOnce(new ApiErrorClass('Already a member', { code: 'conflict', status: 409 }))
    fireEvent.change(screen.getByLabelText(/Username/), { target: { value: 'ada' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    await waitFor(() => expect(h.toastError).toHaveBeenCalledWith('Already a member'))

    // 没有 account_not_found 机器码的 404 也不能说成「账号不存在」
    h.mutateAsync.mockRejectedValueOnce(new ApiErrorClass('Not found', { code: 'not_found', status: 404 }))
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    await waitFor(() => expect(h.toastError).toHaveBeenCalledWith('Not found'))

    expect(screen.queryByText('No account with this username')).toBeNull()
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })

  it('submits the picked roles', async () => {
    renderDialog()

    fireEvent.change(screen.getByLabelText(/Username/), { target: { value: 'ada' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /Administrator/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: /Member/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    await waitFor(() => expect(h.mutateAsync).toHaveBeenCalledWith({ roles: ['admin'], username: 'ada' }))
  })

  it('blocks submit without a username or without any role', async () => {
    renderDialog()

    fireEvent.click(screen.getByRole('checkbox', { name: /Member/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    expect(await screen.findByText('Username is required')).toBeTruthy()
    expect(await screen.findByText('Pick at least one role')).toBeTruthy()
    expect(h.mutateAsync).not.toHaveBeenCalled()
  })
})
