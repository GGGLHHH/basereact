// @vitest-environment happy-dom

import type { AccessPolicyKey } from '@/generated/access-policies'
import type { MemberView } from '@/generated/api-types'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { MembersPage } from './-members-page'

const h = vi.hoisted(() => ({
  granted: new Set<string>(),
  permissions: [] as string[],
  navigate: vi.fn(),
  remove: vi.fn(),
  setRoles: vi.fn(),
}))

const me: MemberView = {
  avatar_url: null,
  display_name: 'Myself',
  email: null,
  id: 'me',
  holds_platform_role: false,
  roles: ['admin'],
  status: 'active',
  username: 'myself',
}

const ada: MemberView = {
  avatar_url: null,
  display_name: 'Ada Lovelace',
  email: 'ada@example.com',
  id: 'u1',
  holds_platform_role: false,
  roles: ['user'],
  status: 'active',
  username: 'ada',
}

// 默认组织里兼任 admin 的 superadmin:持平台角色
const root: MemberView = {
  avatar_url: null,
  display_name: 'Root',
  email: null,
  holds_platform_role: true,
  id: 'root',
  roles: ['admin'],
  status: 'active',
  username: 'root',
}

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock('@tanstack/react-router', () => ({
  getRouteApi: () => ({
    useNavigate: () => h.navigate,
    useSearch: () => ({ page: 1, size: 20 }),
  }),
}))
vi.mock('@/api/members', () => ({
  useAddMember: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useMembers: () => ({
    data: { items: [me, ada, root], page_info: { mode: 'offset', page: 1, size: 20, total: 3 } },
    isPending: false,
  }),
  useRemoveMember: () => ({ isPending: false, mutateAsync: h.remove }),
  useSetMemberRoles: () => ({ isPending: false, mutateAsync: h.setRoles }),
}))
vi.mock('@/lib/use-current-session', () => ({
  useCurrentUserId: () => 'me',
}))
vi.mock('@/lib/use-access-policy', () => ({
  useMyPermissions: () => h.permissions,
  usePolicyGranted: (key: AccessPolicyKey) => h.granted.has(key),
}))

beforeEach(() => {
  h.granted = new Set()
  h.permissions = []
  h.remove.mockReset().mockResolvedValue(undefined)
  h.setRoles.mockReset().mockResolvedValue({ ...ada, roles: ['admin'] })
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

describe('membersPage', () => {
  it('lists members with translated tenant roles', () => {
    render(<MembersPage />)

    expect(screen.getByText('ada')).toBeTruthy()
    expect(screen.getByText('Member')).toBeTruthy()
  })

  it('hides add / edit / remove without members:admin', () => {
    h.granted = new Set(['listMembers'])
    render(<MembersPage />)

    expect(screen.queryByRole('button', { name: /Add member/ })).toBeNull()
    expect(screen.queryByLabelText('Edit roles')).toBeNull()
    expect(screen.queryByLabelText('Remove')).toBeNull()
  })

  it('removes a member only after confirmation', async () => {
    h.granted = new Set(['listMembers', 'addMember', 'setMemberRoles', 'removeMember'])
    render(<MembersPage />)

    expect(screen.getByRole('button', { name: /Add member/ })).toBeTruthy()
    fireEvent.click(screen.getByLabelText('Remove'))
    expect(h.remove).not.toHaveBeenCalled()
    expect(await screen.findByText('Remove member?')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Remove member' }))
    await waitFor(() => expect(h.remove).toHaveBeenCalledWith('u1'))
  })

  it('edits roles through the roles dialog', async () => {
    h.granted = new Set(['listMembers', 'addMember', 'setMemberRoles', 'removeMember'])
    render(<MembersPage />)

    fireEvent.click(screen.getByLabelText('Edit roles'))
    fireEvent.click(await screen.findByRole('checkbox', { name: /Administrator/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(h.setRoles).toHaveBeenCalledWith({ roles: ['admin', 'user'], userId: 'u1' }))
  })

  it('hides edit / remove on the signed-in admin\'s own row', () => {
    h.granted = new Set(['listMembers', 'addMember', 'setMemberRoles', 'removeMember'])
    render(<MembersPage />)

    const rows = [...document.querySelectorAll('tr')]
    const own = rows.find(row => row.textContent.includes('myself'))
    const other = rows.find(row => row.textContent.includes('Ada Lovelace'))
    expect(own?.querySelector('[aria-label="Remove"]')).toBeNull()
    expect(own?.querySelector('[aria-label="Edit roles"]')).toBeNull()
    expect(other?.querySelector('[aria-label="Remove"]')).not.toBeNull()
    expect(other?.querySelector('[aria-label="Edit roles"]')).not.toBeNull()
  })

  it('hides edit / remove on members holding a platform role unless the operator has platform:roles', () => {
    h.granted = new Set(['listMembers', 'addMember', 'setMemberRoles', 'removeMember'])
    const rowOf = (name: string) => [...document.querySelectorAll('tr')].find(row => row.textContent.includes(name))

    render(<MembersPage />)
    expect(rowOf('Root')?.querySelector('[aria-label="Remove"]')).toBeNull()
    expect(rowOf('Root')?.querySelector('[aria-label="Edit roles"]')).toBeNull()
    expect(rowOf('Ada Lovelace')?.querySelector('[aria-label="Remove"]')).not.toBeNull()
    cleanup()

    h.permissions = ['platform:roles']
    render(<MembersPage />)
    expect(rowOf('Root')?.querySelector('[aria-label="Remove"]')).not.toBeNull()
    expect(rowOf('Root')?.querySelector('[aria-label="Edit roles"]')).not.toBeNull()
  })
})
