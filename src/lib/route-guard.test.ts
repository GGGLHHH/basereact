import { QueryClient } from '@tanstack/react-query'
import { isRedirect } from '@tanstack/react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiErrorClass, AUTH_PROBE_HEADER } from './api-client'
import { queryKeys } from './query-keys'
import { requireAdmin, requireAdminGuest, requireUser, requireUserGuest } from './route-guard'

const mocks = vi.hoisted(() => ({
  adminGetMe: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  getMe: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  getMyPermissions: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  matchRoutes: vi.fn<(...args: unknown[]) => unknown>(),
}))

// route-guard 经 #/api/auth 引 myPermissionsQueryOptions,auth.ts 的其余
// generated 导入也走这个 mock,缺一个命名导出就是 import 期报错——全部补上。
vi.mock('#/generated/client', () => ({
  adminGetMe: mocks.adminGetMe,
  adminLogin: vi.fn(),
  changePassword: vi.fn(),
  deleteMe: vi.fn(),
  getMe: mocks.getMe,
  getMyPermissions: mocks.getMyPermissions,
  login: vi.fn(),
  logout: vi.fn(),
  logoutAll: vi.fn(),
  register: vi.fn(),
  updateMe: vi.fn(),
}))

// 守卫在模块内用 matchRoutes 现算匹配链;测试注入假体控制链上的 staticData。
vi.mock('#/lib/global-router', () => ({
  globalRouter: { instance: { matchRoutes: mocks.matchRoutes } },
}))

// GuardLocation 只要 pathname/search;匹配结果全由 mock 的 matchRoutes 决定。
const adminHome = { pathname: '/admin/home', search: {} }

// 镜像 getRouter 的默认值:staleTime 决定探针复用,retry 决定失败即终态。
function freshClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 5 * 60 * 1000 } },
  })
}

async function caught(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise
    return undefined
  } catch (error) {
    return error
  }
}

function redirectTarget(error: unknown): string | undefined {
  if (!isRedirect(error)) {
    return undefined
  }
  return (error as { options: { to?: string } }).options.to
}

beforeEach(() => {
  mocks.adminGetMe.mockReset()
  mocks.getMe.mockReset()
  mocks.getMyPermissions.mockReset()
  mocks.matchRoutes.mockReset()
  mocks.matchRoutes.mockReturnValue([])
})

describe('requireAdmin', () => {
  it('probes with AUTH_PROBE_HEADER, returns me, and reuses the fresh cache', async () => {
    const me = { id: 'u1', roles: ['admin'], username: 'root' }
    mocks.adminGetMe.mockResolvedValue(me)
    const queryClient = freshClient()

    await expect(requireAdmin(queryClient, adminHome)).resolves.toEqual({ me })
    await expect(requireAdmin(queryClient, adminHome)).resolves.toEqual({ me })

    // 第二次命中新鲜缓存,探针只发一次;探针必须带 AUTH_PROBE_HEADER
    // (刷新梯终态 401 才不会命令式跳转)。
    expect(mocks.adminGetMe).toHaveBeenCalledTimes(1)
    const requestOptions = mocks.adminGetMe.mock.calls[0]?.[1] as
      | { headers?: Record<string, string> }
      | undefined
    expect(requestOptions?.headers?.[AUTH_PROBE_HEADER]).toBe('1')
  })

  it('redirects to login on 401 and writes the explicit-anonymous marker', async () => {
    mocks.adminGetMe.mockRejectedValue(new ApiErrorClass('unauthorized', { status: 401 }))
    const queryClient = freshClient()

    const error = await caught(requireAdmin(queryClient, adminHome))
    expect(redirectTarget(error)).toBe('/admin/login')
    expect(queryClient.getQueryData(queryKeys.admin.auth.me())).toBeNull()

    // 后续访问零网络直转登录。
    const again = await caught(requireAdmin(queryClient, adminHome))
    expect(redirectTarget(again)).toBe('/admin/login')
    expect(mocks.adminGetMe).toHaveBeenCalledTimes(1)
  })

  it('redirects to the fullscreen 403 page on 403', async () => {
    mocks.adminGetMe.mockRejectedValue(new ApiErrorClass('forbidden', { status: 403 }))

    const error = await caught(requireAdmin(freshClient(), adminHome))
    expect(redirectTarget(error)).toBe('/403')
  })

  it('skips the network probe when the cache says explicitly anonymous', async () => {
    const queryClient = freshClient()
    queryClient.setQueryData(queryKeys.admin.auth.me(), null)

    const error = await caught(requireAdmin(queryClient, adminHome))
    expect(redirectTarget(error)).toBe('/admin/login')
    expect(mocks.adminGetMe).not.toHaveBeenCalled()
  })

  it('rethrows non-auth errors untouched', async () => {
    const boom = new ApiErrorClass('server exploded', { status: 500 })
    mocks.adminGetMe.mockRejectedValue(boom)

    const error = await caught(requireAdmin(freshClient(), adminHome))
    expect(error).toBe(boom)
  })

  it('never fetches permissions when no matched route declares access', async () => {
    mocks.adminGetMe.mockResolvedValue({ id: 'u1', roles: ['admin'], username: 'root' })
    mocks.matchRoutes.mockReturnValue([{ staticData: { titleKey: 'adminHome' } }])

    // 懒取:未声明的路由零额外请求。
    await requireAdmin(freshClient(), adminHome)
    expect(mocks.getMyPermissions).not.toHaveBeenCalled()
  })

  it('fetches permissions with the probe header and passes a granted chain', async () => {
    mocks.adminGetMe.mockResolvedValue({ id: 'u1', roles: ['admin'], username: 'root' })
    // adminListWidgets = AND(users:admin, admin:login);两权齐链才放行。
    mocks.getMyPermissions.mockResolvedValue({
      permissions: ['users:admin', 'admin:login'],
      roles: ['admin'],
    })
    mocks.matchRoutes.mockReturnValue([
      { staticData: {} },
      { staticData: { accessPolicyKeys: ['adminListWidgets'] } },
    ])
    const queryClient = freshClient()
    const adminWidgets = { pathname: '/admin/widgets', search: {} }

    await expect(requireAdmin(queryClient, adminWidgets)).resolves.toMatchObject({
      me: { id: 'u1' },
    })

    // 匹配链按目标 location 现算(非弃用重载:pathname + search)。
    expect(mocks.matchRoutes).toHaveBeenCalledWith('/admin/widgets', {})
    expect(mocks.getMyPermissions).toHaveBeenCalledTimes(1)
    const requestOptions = mocks.getMyPermissions.mock.calls[0]?.[1] as
      | { headers?: Record<string, string> }
      | undefined
    expect(requestOptions?.headers?.[AUTH_PROBE_HEADER]).toBe('1')

    // 新鲜缓存复用:第二次导航不重发权限请求。
    await requireAdmin(queryClient, adminWidgets)
    expect(mocks.getMyPermissions).toHaveBeenCalledTimes(1)
  })

  it('redirects to the in-shell 403 when a declared policy is not granted', async () => {
    mocks.adminGetMe.mockResolvedValue({ id: 'u1', roles: ['admin'], username: 'root' })
    mocks.getMyPermissions.mockResolvedValue({ permissions: ['contents:read'], roles: ['ops'] })
    mocks.matchRoutes.mockReturnValue([{ staticData: { accessPolicyKeys: ['adminListWidgets'] } }])

    const error = await caught(requireAdmin(freshClient(), adminHome))
    expect(redirectTarget(error)).toBe('/admin/403')
  })

  it('treats a 401 from the permissions fetch as session death', async () => {
    mocks.adminGetMe.mockResolvedValue({ id: 'u1', roles: ['admin'], username: 'root' })
    mocks.getMyPermissions.mockRejectedValue(new ApiErrorClass('unauthorized', { status: 401 }))
    mocks.matchRoutes.mockReturnValue([{ staticData: { accessPolicyKeys: ['adminListWidgets'] } }])
    const queryClient = freshClient()

    const error = await caught(requireAdmin(queryClient, adminHome))
    expect(redirectTarget(error)).toBe('/admin/login')
    expect(queryClient.getQueryData(queryKeys.admin.auth.me())).toBeNull()
  })
})

describe('requireAdminGuest', () => {
  it('redirects a same-tab authenticated admin to the admin home', () => {
    const queryClient = freshClient()
    queryClient.setQueryData(queryKeys.admin.auth.me(), {
      id: 'u1',
      roles: ['admin'],
      username: 'root',
    })

    let error: unknown
    try {
      requireAdminGuest(queryClient)
    } catch (thrown) {
      error = thrown
    }
    expect(redirectTarget(error)).toBe('/admin/home')
    expect(mocks.adminGetMe).not.toHaveBeenCalled()
  })

  it('lets cold-cache visitors through without any network probe', () => {
    // 登录页零阻塞:未知状态不发探针,直接放行。
    expect(() => requireAdminGuest(freshClient())).not.toThrow()
    expect(mocks.adminGetMe).not.toHaveBeenCalled()
  })

  it('lets explicitly-anonymous visitors through without a probe', () => {
    const queryClient = freshClient()
    queryClient.setQueryData(queryKeys.admin.auth.me(), null)

    expect(() => requireAdminGuest(queryClient)).not.toThrow()
    expect(mocks.adminGetMe).not.toHaveBeenCalled()
  })
})

describe('requireUser', () => {
  it('probes with AUTH_PROBE_HEADER, returns me, and reuses the fresh cache', async () => {
    const me = { id: 'u1', username: 'alice' }
    mocks.getMe.mockResolvedValue(me)
    const queryClient = freshClient()

    await expect(requireUser(queryClient)).resolves.toEqual({ me })
    await expect(requireUser(queryClient)).resolves.toEqual({ me })

    // 新鲜缓存复用:探针只发一次,且必带 AUTH_PROBE_HEADER。
    expect(mocks.getMe).toHaveBeenCalledTimes(1)
    const requestOptions = mocks.getMe.mock.calls[0]?.[1] as
      | { headers?: Record<string, string> }
      | undefined
    expect(requestOptions?.headers?.[AUTH_PROBE_HEADER]).toBe('1')
  })

  it('redirects to the frontend login on 401 and writes the anonymous marker', async () => {
    mocks.getMe.mockRejectedValue(new ApiErrorClass('unauthorized', { status: 401 }))
    const queryClient = freshClient()

    const error = await caught(requireUser(queryClient))
    expect(redirectTarget(error)).toBe('/frontend/login')
    expect(queryClient.getQueryData(queryKeys.auth.me())).toBeNull()

    // 后续访问零网络直转登录。
    const again = await caught(requireUser(queryClient))
    expect(redirectTarget(again)).toBe('/frontend/login')
    expect(mocks.getMe).toHaveBeenCalledTimes(1)
  })

  it('skips the network probe when the cache says explicitly anonymous', async () => {
    const queryClient = freshClient()
    queryClient.setQueryData(queryKeys.auth.me(), null)

    const error = await caught(requireUser(queryClient))
    expect(redirectTarget(error)).toBe('/frontend/login')
    expect(mocks.getMe).not.toHaveBeenCalled()
  })

  it('rethrows non-auth errors untouched', async () => {
    const boom = new ApiErrorClass('server exploded', { status: 500 })
    mocks.getMe.mockRejectedValue(boom)

    const error = await caught(requireUser(freshClient()))
    expect(error).toBe(boom)
  })
})

describe('requireUserGuest', () => {
  it('redirects a same-tab authenticated user to the frontend home', () => {
    const queryClient = freshClient()
    queryClient.setQueryData(queryKeys.auth.me(), { id: 'u1', username: 'alice' })

    let error: unknown
    try {
      requireUserGuest(queryClient)
    } catch (thrown) {
      error = thrown
    }
    expect(redirectTarget(error)).toBe('/frontend/home')
    expect(mocks.getMe).not.toHaveBeenCalled()
  })

  it('lets cold-cache and explicitly-anonymous visitors through without a probe', () => {
    expect(() => requireUserGuest(freshClient())).not.toThrow()

    const anon = freshClient()
    anon.setQueryData(queryKeys.auth.me(), null)
    expect(() => requireUserGuest(anon)).not.toThrow()
    expect(mocks.getMe).not.toHaveBeenCalled()
  })
})
