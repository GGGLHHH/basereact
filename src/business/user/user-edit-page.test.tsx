// @vitest-environment happy-dom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AdminUserView } from '#/generated/api-types'

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const h = vi.hoisted(() => ({
  user: null as AdminUserView | null,
  navigate: vi.fn(),
  stub: () => ({ isPending: false, mutateAsync: vi.fn() }),
}))

vi.mock('@/api/users', () => ({
  useUser: () => ({ data: h.user }),
  useUpdateUser: h.stub,
  useSetUserRoles: h.stub,
  useResetUserPassword: h.stub,
}))
vi.mock('@/api/profile', () => ({
  useUserProfile: () => ({ data: null, isLoading: false }),
  useUpdateUserProfile: h.stub,
  useUploadUserAvatar: h.stub,
}))
vi.mock('@/api/roles', () => ({
  useRoles: () => ({ data: [], isLoading: false }),
  useInfiniteRoleOptions: () => ({
    hasNextPage: false,
    isError: false,
    isFetchingNextPage: false,
    isLoading: false,
    items: [],
    onLoadMore: () => {},
    onRetry: () => {},
  }),
}))
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => h.navigate,
  useRouter: () => ({ history: { back: () => {} } }),
}))

import { UserEditPage } from './user-edit-page'

function fakeUser(overrides: Partial<AdminUserView> = {}): AdminUserView {
  return {
    avatar_url: null,
    created_at: '2026-01-01T00:00:00Z',
    display_name: 'Ada',
    email: 'ada@example.com',
    email_verified: true,
    id: 'u1',
    roles: ['admin'],
    username: 'ada',
    ...overrides,
  }
}

beforeEach(() => {
  h.user = fakeUser()
  h.navigate.mockReset()
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
})

describe('UserEditPage composition', () => {
  it('stacks account, roles, password, profile and system sections (profile now under users:admin)', () => {
    render(<UserEditPage userId='u1' />)
    expect(screen.getByText('Account')).toBeTruthy()
    expect(screen.getByText('Roles')).toBeTruthy()
    expect(screen.getByText('Password')).toBeTruthy()
    // profile/avatar folded into users:admin → always shown on the admin edit page.
    expect(screen.getByText('Profile')).toBeTruthy()
    expect(screen.getByText('System')).toBeTruthy()
    // read-only id surfaced (identity header stamp + System reference)
    expect(screen.getAllByText('u1').length).toBeGreaterThan(0)
  })
})
