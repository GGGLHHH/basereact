// @vitest-environment happy-dom

import type { AdminUserView } from '@/generated/api-types'
import { cleanup, render, screen } from '@testing-library/react'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { UserEditPage } from './user-edit-page'

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const h = vi.hoisted(() => ({
  permissions: [] as string[],
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
vi.mock('@/lib/use-access-policy', () => ({
  useMyPermissions: () => h.permissions,
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
  h.permissions = ['users:admin']
  h.navigate.mockReset()
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
})

describe('userEditPage composition', () => {
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

describe('userEditPage platform-role accounts', () => {
  it('shows only a notice (no editable sections) when the operator lacks platform:roles', () => {
    h.user = fakeUser({ roles: ['platform_admin'] })
    h.permissions = ['users:admin', 'tenants:admin']
    render(<UserEditPage userId='u1' />)
    expect(screen.getByRole('note').textContent).toContain('Only the super admin')
    expect(screen.queryByText('Account')).toBeNull()
    expect(screen.queryByText('Password')).toBeNull()
    expect(screen.queryByText('Profile')).toBeNull()
    expect(screen.getByText('System')).toBeTruthy()
  })

  it('lets the super admin edit a platform admin, but never offers role editing on the super admin account', () => {
    h.permissions = ['users:admin', 'platform:roles']
    h.user = fakeUser({ roles: ['platform_admin'] })
    render(<UserEditPage userId='u1' />)
    expect(screen.getByText('Account')).toBeTruthy()
    expect(screen.queryByText(/cannot be changed here/)).toBeNull()
    cleanup()

    h.user = fakeUser({ roles: ['superadmin'] })
    render(<UserEditPage userId='u1' />)
    expect(screen.getByText('Account')).toBeTruthy()
    expect(screen.getByText('Password')).toBeTruthy()
    expect(screen.getByText(/cannot be changed here/)).toBeTruthy()
  })
})
