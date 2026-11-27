// @vitest-environment happy-dom

import { QueryClient } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { AUTH_PROBE_HEADER, requestJson, SOFT_AUTH_HEADER } from './api-client'
import { globalRouter } from './global-router'

const fetchMock = vi.fn<typeof fetch>()

// Node 的 undici Request 不接受相对 URL(浏览器按页面 origin 解析)。
// api-client 的 prefix 是根相对路径,测试里补上基址,行为与浏览器一致。
const OriginalRequest = globalThis.Request
class BaseUrlRequest extends OriginalRequest {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    super(
      typeof input === 'string' && input.startsWith('/') ? `http://localhost${input}` : input,
      init,
    )
  }
}

beforeEach(() => {
  vi.stubGlobal('Request', BaseUrlRequest)
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
  globalRouter.instance = null
})

function jsonResponse(status: number, body: unknown = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

it('refreshes the session and retries the original request after a 401', async () => {
  const calls: string[] = []
  fetchMock.mockImplementation(async (input) => {
    const request = input as Request
    calls.push(new URL(request.url).pathname)
    if (request.url.endsWith('/auth/refresh')) {
      return jsonResponse(200)
    }
    if (request.headers.get('x-retried-after-refresh') === '1') {
      return jsonResponse(200, { ok: true })
    }
    return jsonResponse(401, { error: 'expired' })
  })

  await expect(requestJson('frontend/widgets', { method: 'GET' })).resolves.toEqual({ ok: true })
  expect(calls).toEqual([
    '/api/v1/frontend/widgets',
    '/api/v1/public/auth/refresh',
    '/api/v1/frontend/widgets',
  ])
})

it('throws plainly on soft-auth 401 without refresh or redirect', async () => {
  const navigate = vi.fn()
  globalRouter.instance = {
    navigate,
    state: { location: { pathname: '/' } },
  } as unknown as typeof globalRouter.instance
  fetchMock.mockImplementation(async () => jsonResponse(401, { error: 'unauthorized' }))

  await expect(
    requestJson('admin/auth/me', { headers: { [SOFT_AUTH_HEADER]: '1' }, method: 'GET' }),
  ).rejects.toMatchObject({ status: 401 })
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(navigate).not.toHaveBeenCalled()
})

it('still refreshes for probe requests but never navigates on terminal 401', async () => {
  const navigate = vi.fn()
  globalRouter.instance = {
    navigate,
    state: { location: { pathname: '/' } },
  } as unknown as typeof globalRouter.instance

  const calls: string[] = []
  fetchMock.mockImplementation(async (input) => {
    const request = input as Request
    calls.push(new URL(request.url).pathname)
    // refresh 也 401:会话彻底死亡的终态路径。
    return jsonResponse(401, { error: 'expired' })
  })

  await expect(
    requestJson('admin/auth/me', { headers: { [AUTH_PROBE_HEADER]: '1' }, method: 'GET' }),
  ).rejects.toMatchObject({ status: 401 })
  // 探针照常尝试续期(持有效 refresh token 的用户不能被误踢)……
  expect(calls).toEqual(['/api/v1/admin/auth/me', '/api/v1/public/auth/refresh'])
  // ……但终态失败不做命令式跳转,redirect 归 route-guard。
  expect(navigate).not.toHaveBeenCalled()
})

it('does not enter the refresh ladder for login failures', async () => {
  fetchMock.mockImplementation(async () => jsonResponse(401, { error: 'bad credentials' }))

  await expect(requestJson('admin/auth/login', { method: 'POST', json: {} })).rejects.toMatchObject(
    {
      message: 'bad credentials',
      status: 401,
    },
  )
  expect(fetchMock).toHaveBeenCalledTimes(1)
})

it('gives up after the refreshed retry still returns 401 and routes to login', async () => {
  const navigate = vi.fn()
  const queryClient = new QueryClient()
  // 上一个会话缓存的列表:终态 401 后一条都不能留(下一个登录的可能是别的账号 / 组织)。
  queryClient.setQueryData(['widgets', 'list'], { items: ['previous-session-row'] })
  queryClient.setQueryData(['auth', 'tenants'], [{ id: 't1' }])
  globalRouter.instance = {
    navigate,
    options: { context: { queryClient } },
    state: { location: { pathname: '/' } },
  } as unknown as typeof globalRouter.instance

  const calls: string[] = []
  fetchMock.mockImplementation(async (input) => {
    const request = input as Request
    calls.push(new URL(request.url).pathname)
    if (request.url.endsWith('/auth/refresh')) {
      return jsonResponse(200)
    }
    return jsonResponse(401, { error: 'expired' })
  })

  await expect(requestJson('frontend/widgets', { method: 'GET' })).rejects.toMatchObject({
    status: 401,
  })
  expect(calls).toEqual([
    '/api/v1/frontend/widgets',
    '/api/v1/public/auth/refresh',
    '/api/v1/frontend/widgets',
  ])
  expect(navigate).toHaveBeenCalledWith({ to: '/admin/login' })
  // 终态 401:先清空全部缓存,再写显式匿名标记(守卫才不会在 staleTime 窗口内信任尸体缓存)。
  expect(queryClient.getQueryData(['widgets', 'list'])).toBeUndefined()
  expect(queryClient.getQueryData(['auth', 'tenants'])).toBeUndefined()
  expect(queryClient.getQueryCache().getAll()).toHaveLength(1)
  expect(queryClient.getQueryData(['admin', 'auth', 'me'])).toBeNull()
})

it('shares one refresh across concurrent 401s', async () => {
  let refreshCalls = 0
  fetchMock.mockImplementation(async (input) => {
    const request = input as Request
    if (request.url.endsWith('/auth/refresh')) {
      refreshCalls += 1
      await new Promise(resolve => setTimeout(resolve, 10))
      return jsonResponse(200)
    }
    if (request.headers.get('x-retried-after-refresh') === '1') {
      return jsonResponse(200)
    }
    return jsonResponse(401, { error: 'expired' })
  })

  await Promise.all([
    requestJson('frontend/widgets', { method: 'GET' }),
    requestJson('frontend/contents', { method: 'GET' }),
  ])
  expect(refreshCalls).toBe(1)
})

it('sends a tenant-less user to the admin empty state on tenant_required', async () => {
  const navigate = vi.fn()
  globalRouter.instance = {
    navigate,
    state: { location: { pathname: '/admin/widgets' } },
  } as unknown as typeof globalRouter.instance
  fetchMock.mockImplementation(async () =>
    jsonResponse(403, { code: 'tenant_required', error: 'A current tenant is required' }))

  await expect(requestJson('admin/widgets', { method: 'GET' })).rejects.toMatchObject({
    code: 'tenant_required',
    status: 403,
  })
  expect(navigate).toHaveBeenCalledWith({ to: '/admin/no-tenant' })
})

it('sends a tenant-less user to the frontend empty state outside /admin', async () => {
  const navigate = vi.fn()
  globalRouter.instance = {
    navigate,
    state: { location: { pathname: '/frontend/about' } },
  } as unknown as typeof globalRouter.instance
  fetchMock.mockImplementation(async () =>
    jsonResponse(403, { code: 'tenant_required', error: 'A current tenant is required' }))

  await expect(requestJson('frontend/widgets/stats', { method: 'GET' })).rejects.toMatchObject({
    status: 403,
  })
  expect(navigate).toHaveBeenCalledWith({ to: '/frontend/no-tenant' })
})

it('leaves tenant_required on guard probes and plain 403s to the caller', async () => {
  const navigate = vi.fn()
  globalRouter.instance = {
    navigate,
    state: { location: { pathname: '/admin/home' } },
  } as unknown as typeof globalRouter.instance

  // 守卫探针:redirect 单一归属 route-guard。
  fetchMock.mockImplementation(async () =>
    jsonResponse(403, { code: 'tenant_required', error: 'A current tenant is required' }))
  await expect(
    requestJson('admin/auth/me', { headers: { [AUTH_PROBE_HEADER]: '1' }, method: 'GET' }),
  ).rejects.toMatchObject({ code: 'tenant_required' })

  // 普通权限不足:不是「没加入组织」。
  fetchMock.mockImplementation(async () => jsonResponse(403, { code: 'forbidden', error: 'no' }))
  await expect(requestJson('admin/widgets', { method: 'GET' })).rejects.toMatchObject({ status: 403 })

  expect(navigate).not.toHaveBeenCalled()
})

it('keeps an account with platform roles in place on tenant_required', async () => {
  // spec §4.2:有平台角色、没有租户 = 平台上下文,正常进入,不是「还没加入任何组织」。
  const navigate = vi.fn()
  const me = { email_verified: false, id: 'u1', roles: ['superadmin'], username: 'root' }
  globalRouter.instance = {
    navigate,
    options: {
      context: {
        queryClient: {
          getQueryData: (key: readonly unknown[]) => (key.join('/') === 'admin/auth/me' ? me : undefined),
        },
      },
    },
    state: { location: { pathname: '/admin/widgets' } },
  } as unknown as typeof globalRouter.instance
  fetchMock.mockImplementation(async () =>
    jsonResponse(403, { code: 'tenant_required', error: 'A current tenant is required' }))

  await expect(requestJson('admin/widgets', { method: 'GET' })).rejects.toMatchObject({
    code: 'tenant_required',
  })
  expect(navigate).not.toHaveBeenCalled()
})

it('leaves tenant_required on a login request to the login form (no jump to the empty state)', async () => {
  // 复审 #3:后台登录对没有组织的账号回 403 tenant_required、不发 token。此时人没登录,
  // 不能被带到出口是「登出」的空状态页;错误照常抛给登录表单。
  const navigate = vi.fn()
  globalRouter.instance = {
    navigate,
    state: { location: { pathname: '/admin/login' } },
  } as unknown as typeof globalRouter.instance
  fetchMock.mockImplementation(async () =>
    jsonResponse(403, { code: 'tenant_required', error: 'A current tenant is required' }))

  await expect(
    requestJson('admin/auth/login', { json: { identifier: 'a', password: 'b' }, method: 'POST' }),
  ).rejects.toMatchObject({ code: 'tenant_required', status: 403 })
  await expect(
    requestJson('public/auth/login', { json: { identifier: 'a', password: 'b' }, method: 'POST' }),
  ).rejects.toMatchObject({ code: 'tenant_required', status: 403 })

  expect(navigate).not.toHaveBeenCalled()
})
