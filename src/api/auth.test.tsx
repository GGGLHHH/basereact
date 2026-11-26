// @vitest-environment happy-dom

import type { ReactNode } from 'react'
import type { MyTenantView, UserResponse } from '@/generated/api-types'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { adminLogin, listMyTenants, login, switchTenant } from '@/generated/client'
import { SOFT_AUTH_HEADER } from '@/lib/api-client'
import { queryKeys } from '@/lib/query-keys'

import { frontendLandingAfterLogin, useAdminLogin, useLogin, useMyTenants, useSwitchTenant } from './auth'

const h = vi.hoisted(() => ({
  broadcast: vi.fn(),
  invalidate: vi.fn(),
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
  updateMe: vi.fn(),
}))

vi.mock('@/lib/tenant-sync', () => ({
  broadcastTenantChanged: h.broadcast,
}))

// 只替换 useRouter:切换后「重新进入当前路由」= router.invalidate()。
vi.mock('@tanstack/react-router', async importOriginal => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useRouter: () => ({ invalidate: h.invalidate }),
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
  h.broadcast.mockReset()
})

afterEach(() => {
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
    expect(client.getQueryCache().getAll()).toHaveLength(0)
    expect(h.broadcast).toHaveBeenCalledWith('t2')
    // 重新进入当前路由:守卫 / loader 按新租户重跑。
    expect(h.invalidate).toHaveBeenCalledTimes(1)
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
