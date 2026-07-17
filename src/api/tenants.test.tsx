// @vitest-environment happy-dom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ReactNode } from 'react'
import type { MyTenantResponse, UserResponse } from '#/generated/api-types'

import { listMyTenants, putActiveTenant } from '#/generated/client'
import { queryKeys } from '#/lib/query-keys'

import { useMyTenants, useSwitchTenant } from './tenants'

vi.mock('#/generated/client', () => ({
  listMyTenants: vi.fn(),
  putActiveTenant: vi.fn(),
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
