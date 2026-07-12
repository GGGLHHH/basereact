// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AdminUserView, RoleView } from '#/generated/api-types'

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const catalog: RoleView[] = [
  { display_name: 'Admin', id: 'r-admin', name: 'admin' },
  { display_name: 'Superadmin', id: 'r-superadmin', name: 'superadmin' },
  { display_name: 'User', id: 'r-user', name: 'user' },
]

const h = vi.hoisted(() => ({ mutateAsync: vi.fn(), rolesError: false }))
vi.mock('@/api/roles', () => ({
  useRoles: () => ({
    data: h.rolesError ? undefined : catalog,
    isError: h.rolesError,
    isLoading: false,
    refetch: () => {},
  }),
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
vi.mock('@/api/users', () => ({
  useSetUserRoles: () => ({ isPending: false, mutateAsync: h.mutateAsync }),
}))

import { RolesSection } from './roles-section'

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
  h.mutateAsync.mockReset().mockResolvedValue(fakeUser())
  h.rolesError = false
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

describe('RolesSection', () => {
  it("seeds the user's current roles by mapping names to catalog labels", () => {
    render(<RolesSection user={fakeUser({ roles: ['admin'] })} />)
    // roles:['admin'] (name) → catalog id r-admin → label 'Admin' shown in the trigger.
    expect(screen.getByText('Admin')).toBeTruthy()
  })

  it('saves the selected role ids (uuids), not names', async () => {
    render(<RolesSection user={fakeUser({ roles: ['admin'] })} />)

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(h.mutateAsync).toHaveBeenCalledWith({ id: 'u1', roles: ['r-admin'] }),
    )
  })

  it('shows a retry state (never a saveable empty editor) when the catalog fails to load', () => {
    // Without this guard, a failed catalog load renders an empty editor whose Save
    // full-replaces the user's roles with [] — silent data loss.
    h.rolesError = true
    render(<RolesSection user={fakeUser({ roles: ['admin'] })} />)

    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull()
  })
})
