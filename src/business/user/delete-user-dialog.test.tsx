// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const h = vi.hoisted(() => ({ mutateAsync: vi.fn(), pending: false }))
vi.mock('@/api/users', () => ({
  useDeleteUser: () => ({ isPending: h.pending, mutateAsync: h.mutateAsync }),
}))

import { DeleteUserDialog } from './delete-user-dialog'

beforeEach(() => {
  h.mutateAsync.mockReset().mockResolvedValue(undefined)
  h.pending = false
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

const target = { id: 'u1', username: 'ada' }

describe('DeleteUserDialog', () => {
  it('names the target user in the confirmation copy', () => {
    render(
      <DeleteUserDialog
        open
        user={target}
        onOpenChange={() => {}}
      />,
    )
    expect(screen.getByText(/ada/)).toBeTruthy()
  })

  it('deletes by id then fires onDeleted and closes on confirm', async () => {
    const onOpenChange = vi.fn<(open: boolean) => void>()
    const onDeleted = vi.fn<() => void>()
    render(
      <DeleteUserDialog
        open
        user={target}
        onDeleted={onDeleted}
        onOpenChange={onOpenChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(h.mutateAsync).toHaveBeenCalledWith('u1'))
    expect(onDeleted).toHaveBeenCalledTimes(1)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
