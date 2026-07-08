// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { RoleView } from '#/generated/api-types'

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const catalog: RoleView[] = [
  { display_name: 'Admin', id: 'r-admin', name: 'admin' },
  { display_name: 'Editor', id: 'r-editor', name: 'editor' },
]

const h = vi.hoisted(() => ({ mutateAsync: vi.fn(), navigate: vi.fn() }))
vi.mock('@/api/users', () => ({
  useCreateUser: () => ({ isPending: false, mutateAsync: h.mutateAsync }),
}))
vi.mock('@/api/roles', () => ({
  useInfiniteRoleOptions: () => ({
    hasNextPage: false,
    isError: false,
    isFetchingNextPage: false,
    isLoading: false,
    items: catalog,
    onLoadMore: () => {},
    onRetry: () => {},
  }),
}))
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => h.navigate,
  useRouter: () => ({ history: { back: () => {} } }),
}))

import { UserCreatePage } from './user-create-page'

beforeEach(() => {
  h.mutateAsync.mockReset().mockResolvedValue({ id: 'new-id' })
  h.navigate.mockReset().mockResolvedValue(undefined)
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  if (!(Element.prototype as { hasPointerCapture?: unknown }).hasPointerCapture) {
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

describe('UserCreatePage', () => {
  it('submits a CreateUserRequest with trimmed email and no roles when none picked', async () => {
    render(<UserCreatePage />)

    fireEvent.change(screen.getByLabelText(/Username/), { target: { value: 'ada' } })
    fireEvent.change(screen.getByLabelText(/Password/), { target: { value: 'secret' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: '  ada@example.com ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create user' }))

    await waitFor(() => expect(h.mutateAsync).toHaveBeenCalledTimes(1))
    expect(h.mutateAsync).toHaveBeenCalledWith({
      email: 'ada@example.com',
      password: 'secret',
      roles: [],
      username: 'ada',
    })
    await waitFor(() => expect(h.navigate).toHaveBeenCalledWith({ to: '/admin/users' }))
  })

  it('clears an emptied email to null', async () => {
    render(<UserCreatePage />)

    fireEvent.change(screen.getByLabelText(/Username/), { target: { value: 'bob' } })
    fireEvent.change(screen.getByLabelText(/Password/), { target: { value: 'hunter2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create user' }))

    await waitFor(() => expect(h.mutateAsync).toHaveBeenCalledTimes(1))
    expect(h.mutateAsync).toHaveBeenCalledWith({
      email: null,
      password: 'hunter2',
      roles: [],
      username: 'bob',
    })
  })

  it('submits selected role ids (uuids) chosen from the picker', async () => {
    render(<UserCreatePage />)

    fireEvent.change(screen.getByLabelText(/Username/), { target: { value: 'ada' } })
    fireEvent.change(screen.getByLabelText(/Password/), { target: { value: 'secret' } })

    // open the role picker, toggle 'Admin'
    fireEvent.click(screen.getByText('e.g. admin, editor'))
    fireEvent.click(await screen.findByRole('button', { name: 'Admin' }))

    fireEvent.click(screen.getByRole('button', { name: 'Create user' }))

    await waitFor(() =>
      expect(h.mutateAsync).toHaveBeenCalledWith({
        email: null,
        password: 'secret',
        roles: ['r-admin'],
        username: 'ada',
      }),
    )
  })

  it('blocks submit and skips the API when username is missing', async () => {
    render(<UserCreatePage />)

    fireEvent.change(screen.getByLabelText(/Password/), { target: { value: 'secret' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create user' }))

    await waitFor(() => expect(screen.getByText('Username is required')).toBeTruthy())
    expect(h.mutateAsync).not.toHaveBeenCalled()
  })

  it('rejects a whitespace-only username instead of posting an empty one', async () => {
    render(<UserCreatePage />)

    fireEvent.change(screen.getByLabelText(/Username/), { target: { value: '   ' } })
    fireEvent.change(screen.getByLabelText(/Password/), { target: { value: 'secret' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create user' }))

    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(h.mutateAsync).not.toHaveBeenCalled()
  })
})
