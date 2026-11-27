// @vitest-environment happy-dom

import type { ReactNode } from 'react'
import type { MyTenantView, UserResponse } from '@/generated/api-types'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'

import { cleanup, render, renderHook, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { adminLogin, changePassword, deleteMe, listMyTenants, login, logout, logoutAll, register, switchTenant } from '@/generated/client'
import { SOFT_AUTH_HEADER } from '@/lib/api-client'
import { queryKeys } from '@/lib/query-keys'

import {
  frontendLandingAfterLogin,
  useAdminLogin,
  useChangePassword,
  useDeleteMe,
  useLogin,
  useLogout,
  useLogoutAll,
  useMyTenants,
  useRegister,
  useSwitchTenant,
} from './auth'

const h = vi.hoisted(() => ({
  broadcast: vi.fn(),
  invalidate: vi.fn(),
  navigate: vi.fn(),
  /** useRouter().state.location.pathname:改密码后按所在 surface 回对应的登录页。 */
  pathname: '/admin/profile',
}))

// auth.ts 的其余 generated 导入也走这个 mock,缺一个命名导出就是调用期报错——全部补上。
vi.mock('@/generated/client', () => ({
  adminGetMe: vi.fn(),
  adminLogin: vi.fn(),
  changePassword: vi.fn(),
  deleteMe: vi.fn(),
  getMe: vi.fn(),
  getMyPermissions: vi.fn(),
  listMyTenants: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  logoutAll: vi.fn(),
  register: vi.fn(),
  switchTenant: vi.fn(),
}))

// 只替换广播;refreshSession 用真的(切换后的缓存行为就是它)。
vi.mock('@/lib/session-sync', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/session-sync')>()),
  broadcastSessionChanged: h.broadcast,
}))

// 只替换 useRouter:切换后「重新进入当前路由」= router.invalidate();改密码后回登录页 = navigate。
vi.mock('@tanstack/react-router', async importOriginal => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useRouter: () => ({
    invalidate: h.invalidate,
    navigate: h.navigate,
    state: { location: { pathname: h.pathname } },
  }),
}))

function makeClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })
}

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

function fakeUser(overrides: Partial<UserResponse> = {}): UserResponse {
  return { email_verified: false, id: 'u1', roles: [], username: 'alice', ...overrides }
}

function tenant(id: string, current = false): MyTenantView {
  return { current, id, name: id, roles: ['user'], slug: id }
}

beforeEach(() => {
  h.invalidate.mockReset().mockResolvedValue(undefined)
  h.navigate.mockReset().mockResolvedValue(undefined)
  h.broadcast.mockReset()
  h.pathname = '/admin/profile'
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('useMyTenants', () => {
  it('reads GET /frontend/auth/tenants under the auth.tenants key', async () => {
    vi.mocked(listMyTenants).mockResolvedValue([tenant('t1', true), tenant('t2')])
    const client = makeClient()

    const { result } = renderHook(() => useMyTenants(), { wrapper: wrapper(client) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(listMyTenants).toHaveBeenCalledWith({})
    expect(client.getQueryData(queryKeys.auth.tenants())).toHaveLength(2)
  })
})

describe('useMyTenants soft probe', () => {
  it('sends SOFT_AUTH_HEADER so anonymous visitors are not bounced to login', async () => {
    vi.mocked(listMyTenants).mockResolvedValue([])
    const { result } = renderHook(() => useMyTenants({ soft: true }), { wrapper: wrapper(makeClient()) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(listMyTenants).toHaveBeenCalledWith({}, { headers: { [SOFT_AUTH_HEADER]: '1' } })
  })
})

describe('useSwitchTenant', () => {
  it('switch_clears_cache_and_broadcasts', async () => {
    vi.mocked(switchTenant).mockResolvedValue(fakeUser())
    const client = makeClient()
    // 上一个租户的数据:切换后一条都不能留。
    client.setQueryData(queryKeys.widgets.list(), { items: ['tenant-a-row'] })
    client.setQueryData(queryKeys.auth.tenants(), [tenant('t1', true), tenant('t2')])

    const { result } = renderHook(() => useSwitchTenant(), { wrapper: wrapper(client) })
    await result.current.mutateAsync('t2')

    expect(switchTenant).toHaveBeenCalledWith({ body: { tenant_id: 't2' } })
    expect(client.getQueryData(queryKeys.widgets.list())).toBeUndefined()
    expect(client.getQueryData(queryKeys.auth.tenants())).toBeUndefined()
    expect(h.broadcast).toHaveBeenCalledWith('tenant-switched')
    // 重新进入当前路由:守卫 / loader 按新租户重跑。
    expect(h.invalidate).toHaveBeenCalledTimes(1)
  })

  it('refetches the queries on screen with the new tenant instead of leaving them on the old data', async () => {
    // 复审 #1:clear() 之后,已挂载的 useQuery 绑在被删掉的旧查询上,既不重取也不清空。
    let tenantId = 't1'
    const queryFn = vi.fn(async () => ({ items: [`${tenantId}-row`] }))
    vi.mocked(switchTenant).mockImplementation(async ({ body }) => {
      tenantId = body.tenant_id
      return fakeUser()
    })
    const client = makeClient()
    // 列表单独一个 React 根:切换 mutation 的状态变化不会顺带让它重渲染(页面上的列表也不会)。
    function List() {
      const { data } = useQuery({ queryFn, queryKey: queryKeys.widgets.list() })
      return <div>{data ? data.items.join(',') : 'loading'}</div>
    }
    render(<List />, { wrapper: wrapper(client) })
    expect(await screen.findByText('t1-row')).toBeTruthy()

    const { result } = renderHook(() => useSwitchTenant(), { wrapper: wrapper(client) })
    await result.current.mutateAsync('t2')

    expect(await screen.findByText('t2-row')).toBeTruthy()
    expect(screen.queryByText('t1-row')).toBeNull()
    expect(queryFn).toHaveBeenCalledTimes(2)
  })

  it('keeps the cache and stays silent when the switch fails', async () => {
    vi.mocked(switchTenant).mockRejectedValue(new Error('forbidden'))
    const client = makeClient()
    client.setQueryData(queryKeys.widgets.list(), { items: ['tenant-a-row'] })

    const { result } = renderHook(() => useSwitchTenant(), { wrapper: wrapper(client) })
    await expect(result.current.mutateAsync('t2')).rejects.toThrow('forbidden')

    expect(client.getQueryData(queryKeys.widgets.list())).toEqual({ items: ['tenant-a-row'] })
    expect(h.broadcast).not.toHaveBeenCalled()
    expect(h.invalidate).not.toHaveBeenCalled()
  })
})

// 换账号 / 换组织登录:上一个会话缓存的列表一条都不能在新会话里渲染出来。
describe('login clears every cached query', () => {
  function seedPreviousSession(client: QueryClient) {
    client.setQueryData(queryKeys.widgets.list(), { items: ['previous-account-row'] })
    client.setQueryData(queryKeys.members.list(), { items: ['previous-tenant-member'] })
    client.setQueryData(queryKeys.auth.tenants(), [tenant('t1', true)])
    // 登出留下的匿名标记
    client.setQueryData(queryKeys.admin.auth.me(), null)
  }

  it('admin login clears the cache and does not seed me', async () => {
    vi.mocked(adminLogin).mockResolvedValue(fakeUser({ roles: ['superadmin'] }))
    const client = makeClient()
    seedPreviousSession(client)

    const { result } = renderHook(() => useAdminLogin(), { wrapper: wrapper(client) })
    await result.current.mutateAsync({ identifier: 'alice', password: 'pw' })

    expect(client.getQueryCache().getAll()).toHaveLength(0)
  })

  it('frontend login clears the cache and seeds only the new me', async () => {
    const user = fakeUser({ id: 'u2', username: 'bob' })
    vi.mocked(login).mockResolvedValue(user)
    const client = makeClient()
    seedPreviousSession(client)

    const { result } = renderHook(() => useLogin(), { wrapper: wrapper(client) })
    await result.current.mutateAsync({ identifier: 'bob', password: 'pw' })

    expect(client.getQueryData(queryKeys.widgets.list())).toBeUndefined()
    expect(client.getQueryData(queryKeys.members.list())).toBeUndefined()
    expect(client.getQueryData(queryKeys.auth.tenants())).toBeUndefined()
    expect(client.getQueryCache().getAll()).toHaveLength(1)
    expect(client.getQueryData(queryKeys.auth.me())).toEqual(user)
  })

  it('keeps the cache when login fails', async () => {
    vi.mocked(login).mockRejectedValue(new Error('bad credentials'))
    const client = makeClient()
    seedPreviousSession(client)

    const { result } = renderHook(() => useLogin(), { wrapper: wrapper(client) })
    await expect(result.current.mutateAsync({ identifier: 'bob', password: 'x' })).rejects.toThrow()

    expect(client.getQueryData(queryKeys.widgets.list())).toEqual({ items: ['previous-account-row'] })
  })
})

// 共享 cookie 里的会话变了:通知其他标签页(复审 #2)。失败时不广播。
describe('session changes are broadcast to other tabs', () => {
  it('admin and frontend login broadcast login', async () => {
    vi.mocked(adminLogin).mockResolvedValue(fakeUser())
    vi.mocked(login).mockResolvedValue(fakeUser())
    const client = makeClient()

    const admin = renderHook(() => useAdminLogin(), { wrapper: wrapper(client) })
    await admin.result.current.mutateAsync({ identifier: 'alice', password: 'pw' })
    expect(h.broadcast).toHaveBeenLastCalledWith('login')

    const frontend = renderHook(() => useLogin(), { wrapper: wrapper(client) })
    await frontend.result.current.mutateAsync({ identifier: 'alice', password: 'pw' })
    expect(h.broadcast).toHaveBeenCalledTimes(2)
    expect(h.broadcast).toHaveBeenLastCalledWith('login')
  })

  it('register (signs the new account in) broadcasts login', async () => {
    vi.mocked(register).mockResolvedValue(fakeUser())
    const { result } = renderHook(() => useRegister(), { wrapper: wrapper(makeClient()) })
    await result.current.mutateAsync({ password: 'pw-long-enough', username: 'alice' })
    expect(h.broadcast).toHaveBeenCalledWith('login')
  })

  it('logout, logout-all and delete-me broadcast logout', async () => {
    vi.mocked(logout).mockResolvedValue(undefined)
    vi.mocked(logoutAll).mockResolvedValue(undefined)
    vi.mocked(deleteMe).mockResolvedValue(undefined)
    const client = makeClient()

    await renderHook(() => useLogout(), { wrapper: wrapper(client) }).result.current.mutateAsync()
    await renderHook(() => useLogoutAll(), { wrapper: wrapper(client) }).result.current.mutateAsync()
    await renderHook(() => useDeleteMe(), { wrapper: wrapper(client) }).result.current.mutateAsync({ password: 'pw' })

    expect(h.broadcast.mock.calls).toEqual([['logout'], ['logout'], ['logout']])
  })

  it('does not broadcast when login or logout fails', async () => {
    vi.mocked(adminLogin).mockRejectedValue(new Error('bad credentials'))
    vi.mocked(logout).mockRejectedValue(new Error('network'))
    const client = makeClient()

    await expect(
      renderHook(() => useAdminLogin(), { wrapper: wrapper(client) }).result.current.mutateAsync({ identifier: 'a', password: 'b' }),
    ).rejects.toThrow()
    await expect(renderHook(() => useLogout(), { wrapper: wrapper(client) }).result.current.mutateAsync()).rejects.toThrow()

    expect(h.broadcast).not.toHaveBeenCalled()
  })
})

// 后端改密码会撤销该账号的全部会话、清掉 auth cookie(同登出):本页和其他标签页都得离开已结束的会话。
describe('useChangePassword ends the session like logout', () => {
  function seedSession(client: QueryClient) {
    client.setQueryData(queryKeys.admin.auth.me(), fakeUser())
    client.setQueryData(queryKeys.auth.me(), fakeUser())
    client.setQueryData(queryKeys.widgets.list(), { items: ['row-of-ended-session'] })
  }

  it('broadcasts logout, goes to the admin login page and keeps only the anonymous markers', async () => {
    vi.mocked(changePassword).mockResolvedValue(undefined)
    const client = makeClient()
    seedSession(client)
    // 导航那一刻:匿名标记已经写好(登录页 guest 闸见到旧用户会弹回首页),旧数据还没清(先离开页面再清)。
    let atNavigate: { adminMe: unknown, widgets: unknown } | undefined
    h.navigate.mockImplementation(async () => {
      atNavigate = {
        adminMe: client.getQueryData(queryKeys.admin.auth.me()),
        widgets: client.getQueryData(queryKeys.widgets.list()),
      }
    })

    const { result } = renderHook(() => useChangePassword(), { wrapper: wrapper(client) })
    await result.current.mutateAsync({ current_password: 'old-pw', new_password: 'new-password-1' })

    expect(changePassword).toHaveBeenCalledWith({ body: { current_password: 'old-pw', new_password: 'new-password-1' } })
    expect(h.broadcast.mock.calls).toEqual([['logout']])
    expect(h.navigate).toHaveBeenCalledExactlyOnceWith({ to: '/admin/login' })
    expect(atNavigate).toEqual({ adminMe: null, widgets: { items: ['row-of-ended-session'] } })
    // 上一个会话的数据一条不留,只剩两个 surface 的显式匿名标记。
    expect(client.getQueryData(queryKeys.widgets.list())).toBeUndefined()
    expect(client.getQueryData(queryKeys.admin.auth.me())).toBeNull()
    expect(client.getQueryData(queryKeys.auth.me())).toBeNull()
    expect(client.getQueryCache().getAll()).toHaveLength(2)
  })

  it('goes to the frontend login page when changed from the public site', async () => {
    vi.mocked(changePassword).mockResolvedValue(undefined)
    h.pathname = '/frontend/account'
    const client = makeClient()
    seedSession(client)

    const { result } = renderHook(() => useChangePassword(), { wrapper: wrapper(client) })
    await result.current.mutateAsync({ current_password: 'old-pw', new_password: 'new-password-1' })

    expect(h.navigate).toHaveBeenCalledExactlyOnceWith({ to: '/frontend/login' })
    expect(client.getQueryData(queryKeys.auth.me())).toBeNull()
    expect(h.broadcast).toHaveBeenCalledWith('logout')
  })

  it('keeps the session, the cache and stays silent when the change fails', async () => {
    vi.mocked(changePassword).mockRejectedValue(new Error('wrong current password'))
    const client = makeClient()
    seedSession(client)

    const { result } = renderHook(() => useChangePassword(), { wrapper: wrapper(client) })
    await expect(
      result.current.mutateAsync({ current_password: 'wrong', new_password: 'new-password-1' }),
    ).rejects.toThrow('wrong current password')

    expect(h.broadcast).not.toHaveBeenCalled()
    expect(h.navigate).not.toHaveBeenCalled()
    expect(client.getQueryData(queryKeys.admin.auth.me())).toEqual(fakeUser())
    expect(client.getQueryData(queryKeys.widgets.list())).toEqual({ items: ['row-of-ended-session'] })
  })
})

describe('frontendLandingAfterLogin', () => {
  it('no_tenant_user_sees_empty_state', async () => {
    vi.mocked(listMyTenants).mockResolvedValue([])

    await expect(frontendLandingAfterLogin(makeClient(), fakeUser())).resolves.toBe('/frontend/no-tenant')
  })

  it('lands members and platform accounts on the home page', async () => {
    vi.mocked(listMyTenants).mockResolvedValue([tenant('t1', true)])
    await expect(frontendLandingAfterLogin(makeClient(), fakeUser())).resolves.toBe('/frontend/home')

    // 有平台角色、没有租户:正常进入(spec §4.2)。
    vi.mocked(listMyTenants).mockResolvedValue([])
    await expect(
      frontendLandingAfterLogin(makeClient(), fakeUser({ roles: ['superadmin'] })),
    ).resolves.toBe('/frontend/home')
  })

  it('falls back to the home page when the tenant list cannot be read', async () => {
    vi.mocked(listMyTenants).mockRejectedValue(new Error('network'))
    await expect(frontendLandingAfterLogin(makeClient(), fakeUser())).resolves.toBe('/frontend/home')
  })
})
