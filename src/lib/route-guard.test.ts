import { QueryClient } from '@tanstack/react-query'
import { isRedirect } from '@tanstack/react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiErrorClass, AUTH_PROBE_HEADER } from './api-client'
import { queryKeys } from './query-keys'
import { requireAdmin, requireAdminGuest } from './route-guard'

const mocks = vi.hoisted(() => ({
  adminGetMe: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
}))

vi.mock('#/generated/client', () => ({
  adminGetMe: mocks.adminGetMe,
}))

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
})

describe('requireAdmin', () => {
  it('probes with AUTH_PROBE_HEADER, returns me, and reuses the fresh cache', async () => {
    const me = { id: 'u1', roles: ['admin'], username: 'root' }
    mocks.adminGetMe.mockResolvedValue(me)
    const queryClient = freshClient()

    await expect(requireAdmin(queryClient)).resolves.toEqual({ me })
    await expect(requireAdmin(queryClient)).resolves.toEqual({ me })

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

    const error = await caught(requireAdmin(queryClient))
    expect(redirectTarget(error)).toBe('/admin/login')
    expect(queryClient.getQueryData(queryKeys.admin.auth.me())).toBeNull()

    // 后续访问零网络直转登录。
    const again = await caught(requireAdmin(queryClient))
    expect(redirectTarget(again)).toBe('/admin/login')
    expect(mocks.adminGetMe).toHaveBeenCalledTimes(1)
  })

  it('redirects to the fullscreen 403 page on 403', async () => {
    mocks.adminGetMe.mockRejectedValue(new ApiErrorClass('forbidden', { status: 403 }))

    const error = await caught(requireAdmin(freshClient()))
    expect(redirectTarget(error)).toBe('/403')
  })

  it('skips the network probe when the cache says explicitly anonymous', async () => {
    const queryClient = freshClient()
    queryClient.setQueryData(queryKeys.admin.auth.me(), null)

    const error = await caught(requireAdmin(queryClient))
    expect(redirectTarget(error)).toBe('/admin/login')
    expect(mocks.adminGetMe).not.toHaveBeenCalled()
  })

  it('rethrows non-auth errors untouched', async () => {
    const boom = new ApiErrorClass('server exploded', { status: 500 })
    mocks.adminGetMe.mockRejectedValue(boom)

    const error = await caught(requireAdmin(freshClient()))
    expect(error).toBe(boom)
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
