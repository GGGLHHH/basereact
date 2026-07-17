// @vitest-environment happy-dom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ReactNode } from 'react'
import type { MyTenantResponse, UserResponse } from '#/generated/api-types'

import {
  addMember,
  createTenant,
  listMembers,
  listMyTenants,
  listTenants,
  putActiveTenant,
  removeMember,
  updateTenant,
} from '#/generated/client'
import { queryKeys } from '#/lib/query-keys'

import {
  useCreateTenant,
  useInviteMember,
  useMyTenants,
  useRemoveMember,
  useSwitchTenant,
  useTenantMembers,
  useTenants,
  useUpdateTenant,
} from './tenants'

vi.mock('#/generated/client', () => ({
  listMyTenants: vi.fn(),
  putActiveTenant: vi.fn(),
  listTenants: vi.fn(),
  createTenant: vi.fn(),
  updateTenant: vi.fn(),
  listMembers: vi.fn(),
  addMember: vi.fn(),
  removeMember: vi.fn(),
}))

function fakeTenant(overrides: Partial<MyTenantResponse> = {}): MyTenantResponse {
  return {
    display_name: 'Acme 公司',
    id: 't-acme',
    is_active: true,
    name: 'acme',
    ...overrides,
  }
}

function fakeUser(overrides: Partial<UserResponse> = {}): UserResponse {
  return {
    email: null,
    email_verified: false,
    id: 'u1',
    roles: ['user'],
    username: 'user',
    ...overrides,
  }
}

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

afterEach(() => vi.clearAllMocks())

describe('useMyTenants', () => {
  it('0 租户返回空数组(register 的常规出口)', async () => {
    vi.mocked(listMyTenants).mockResolvedValue([])
    const client = makeClient()
    const { result } = renderHook(() => useMyTenants(), { wrapper: wrapper(client) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })

  it('多租户按后端顺序返回,恰好一条 is_active', async () => {
    vi.mocked(listMyTenants).mockResolvedValue([
      fakeTenant({ id: 't-acme', is_active: true }),
      fakeTenant({ id: 't-globex', display_name: 'Globex 公司', is_active: false, name: 'globex' }),
    ])
    const client = makeClient()
    const { result } = renderHook(() => useMyTenants(), { wrapper: wrapper(client) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.map((x) => x.id)).toEqual(['t-acme', 't-globex'])
    expect(result.current.data?.filter((x) => x.is_active)).toHaveLength(1)
  })
})

describe('useSwitchTenant — 缓存策略是安全关键点', () => {
  it('切换成功后清全部业务缓存(不然会串公司数据)', async () => {
    vi.mocked(putActiveTenant).mockResolvedValue(fakeUser())
    const client = makeClient()

    // 预置几份「旧公司」的业务缓存 —— 切换后它们必须全部消失。
    client.setQueryData(queryKeys.widgets.list(), [{ id: 'old-widget' }])
    client.setQueryData(queryKeys.contents.list(), [{ id: 'old-content' }])
    client.setQueryData(queryKeys.auth.tenants(), [fakeTenant()])

    const { result } = renderHook(() => useSwitchTenant(), { wrapper: wrapper(client) })
    result.current.mutate({ tenant_id: 't-globex' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // **核心断言**:旧公司的业务缓存必须没了 —— 这是「A 公司数据不显示在 B 公司界面」的前端收口。
    expect(client.getQueryData(queryKeys.widgets.list())).toBeUndefined()
    expect(client.getQueryData(queryKeys.contents.list())).toBeUndefined()
    expect(client.getQueryData(queryKeys.auth.tenants())).toBeUndefined()
  })

  it('清完立即种上新 me(切换端点的响应),免得守卫再打一次', async () => {
    const newMe = fakeUser({ username: 'user', roles: ['user'] })
    vi.mocked(putActiveTenant).mockResolvedValue(newMe)
    const client = makeClient()

    const { result } = renderHook(() => useSwitchTenant(), { wrapper: wrapper(client) })
    result.current.mutate({ tenant_id: 't-globex' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(client.getQueryData(queryKeys.auth.me())).toEqual(newMe)
  })

  it('用 SetActiveTenantRequest 的形状调端点', async () => {
    vi.mocked(putActiveTenant).mockResolvedValue(fakeUser())
    const client = makeClient()
    const { result } = renderHook(() => useSwitchTenant(), { wrapper: wrapper(client) })
    result.current.mutate({ tenant_id: 't-globex' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(putActiveTenant).toHaveBeenCalledWith({ body: { tenant_id: 't-globex' } })
  })
})

describe('平台租户管理 hooks', () => {
  it('useTenants 列表', async () => {
    vi.mocked(listTenants).mockResolvedValue([
      {
        id: 't1',
        name: 'acme',
        display_name: 'Acme',
        status: 'active',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    ])
    const client = makeClient()
    const { result } = renderHook(() => useTenants(), { wrapper: wrapper(client) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.[0].name).toBe('acme')
  })

  it('useCreateTenant 成功后失效租户列表缓存', async () => {
    vi.mocked(createTenant).mockResolvedValue({
      id: 't2',
      name: 'newco',
      display_name: 'New',
      status: 'active',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    })
    const client = makeClient()
    const spy = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useCreateTenant(), { wrapper: wrapper(client) })
    result.current.mutate({ name: 'newco', display_name: 'New' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.tenantsAdmin.all })
  })

  it('useUpdateTenant 调端点,并用返回实体补丁列表那一行(乐观)', async () => {
    const suspended = {
      id: 't1',
      name: 'acme',
      display_name: 'Acme',
      status: 'suspended' as const,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    }
    vi.mocked(updateTenant).mockResolvedValue(suspended)
    const client = makeClient()
    // 预置列表缓存里那行还是 active —— 成功后必须被补成 suspended,不等 refetch。
    client.setQueryData(queryKeys.tenantsAdmin.list(), [{ ...suspended, status: 'active' }])

    const { result } = renderHook(() => useUpdateTenant(), { wrapper: wrapper(client) })
    result.current.mutate({ id: 't1', request: { display_name: 'Acme', status: 'suspended' } })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(updateTenant).toHaveBeenCalledWith({
      path: { id: 't1' },
      body: { display_name: 'Acme', status: 'suspended' },
    })
    // **核心断言**:缓存行已被服务器真值补丁(同 users.ts 的 useUpdateUser 口径)。
    const cached = client.getQueryData(queryKeys.tenantsAdmin.list()) as Array<{ status: string }>
    expect(cached[0].status).toBe('suspended')
  })
})

describe('租户内成员管理 hooks', () => {
  it('useTenantMembers 列成员', async () => {
    vi.mocked(listMembers).mockResolvedValue([
      { user_id: 'u1', username: 'alice', role: 'admin', granted_at: '2026-01-01T00:00:00Z' },
    ])
    const client = makeClient()
    const { result } = renderHook(() => useTenantMembers(), { wrapper: wrapper(client) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.[0].username).toBe('alice')
  })

  it('useInviteMember 成功后失效成员缓存', async () => {
    vi.mocked(addMember).mockResolvedValue()
    const client = makeClient()
    const spy = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useInviteMember(), { wrapper: wrapper(client) })
    result.current.mutate({ identifier: 'bob', role: 'member' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(addMember).toHaveBeenCalledWith({ body: { identifier: 'bob', role: 'member' } })
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.auth.members() })
  })

  it('useRemoveMember 调端点,并从成员缓存里删掉那行(乐观)', async () => {
    vi.mocked(removeMember).mockResolvedValue()
    const client = makeClient()
    // 预置成员列表含 u9 —— 成功后必须被删掉,不等 refetch。
    client.setQueryData(queryKeys.auth.members(), [
      { user_id: 'u1', username: 'alice', role: 'admin', granted_at: '2026-01-01T00:00:00Z' },
      { user_id: 'u9', username: 'bob', role: 'member', granted_at: '2026-01-01T00:00:00Z' },
    ])

    const { result } = renderHook(() => useRemoveMember(), { wrapper: wrapper(client) })
    result.current.mutate('u9')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(removeMember).toHaveBeenCalledWith({ path: { user_id: 'u9' } })
    // **核心断言**:被移除的成员已从缓存消失(同 users.ts 的 useDeleteUser 口径)。
    const cached = client.getQueryData(queryKeys.auth.members()) as Array<{ user_id: string }>
    expect(cached.map((m) => m.user_id)).toEqual(['u1'])
  })
})
