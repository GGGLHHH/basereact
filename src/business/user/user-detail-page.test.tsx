// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AdminUserView } from '#/generated/api-types'

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const h = vi.hoisted(() => ({
  deleteMutate: vi.fn(),
  navigate: vi.fn(),
  user: null as AdminUserView | null,
}))
vi.mock('@/api/users', () => ({
  useDeleteUser: () => ({ isPending: false, mutateAsync: h.deleteMutate }),
  useUser: () => ({ data: h.user }),
}))
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => h.navigate,
  useRouter: () => ({ history: { back: () => {} } }),
}))

import { UserDetailPage } from './user-detail-page'

function fakeUser(overrides: Partial<AdminUserView> = {}): AdminUserView {
  return {
    avatar_url: null,
    created_at: '2026-01-01T00:00:00Z',
    display_name: 'Ada Lovelace',
    email: 'ada@example.com',
    email_verified: true,
    id: 'u1',
    roles: ['admin', 'editor'],
    username: 'ada',
    ...overrides,
  }
}

beforeEach(() => {
  h.user = fakeUser()
  h.deleteMutate.mockReset().mockResolvedValue(undefined)
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

describe('UserDetailPage', () => {
  it('renders the loaded user fields', () => {
    render(<UserDetailPage userId='u1' />)
    expect(screen.getAllByText('ada').length).toBeGreaterThan(0)
    expect(screen.getByText('ada@example.com')).toBeTruthy()
    // 角色现为独立 chips(RoleBadges),不再是合并串。
    expect(screen.getByText('admin')).toBeTruthy()
    expect(screen.getByText('editor')).toBeTruthy()
  })

  it('navigates to the edit page from the Edit action', () => {
    render(<UserDetailPage userId='u1' />)
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    expect(h.navigate).toHaveBeenCalledWith({
      params: { userId: 'u1' },
      to: '/admin/users/$userId/edit',
    })
  })

  it('deletes then returns to the list after confirming', async () => {
    render(<UserDetailPage userId='u1' />)

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    const dialog = screen.getByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(h.deleteMutate).toHaveBeenCalledWith('u1'))
    await waitFor(() => expect(h.navigate).toHaveBeenCalledWith({ to: '/admin/users' }))
  })
})
