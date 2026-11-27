// @vitest-environment happy-dom

// 改密码 / 注销的「密码不对」(401 invalid_credentials)不是会话过期:错误必须原样交给调用方,
// 不刷新、不跳登录页、不清缓存、不弹「会话过期」。不 mock 接口层 —— 走真的 generated client →
// api 拦截器,只在 fetch 这一层回放后端的响应(形状照 baserust 的 ErrorBody)。

import type { ApiErrorClass } from '@/lib/api-client'
import { QueryClient } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({ toastError: vi.fn() }))

// 只为能断言「没弹会话过期」;拦截器本身照旧调用它。
vi.mock('sonner', () => ({ toast: { error: h.toastError } }))

const fetchMock = vi.fn<typeof fetch>()

// Node 的 Request 不接受相对 URL(浏览器按页面 origin 解析);补上基址,行为与浏览器一致。
const OriginalRequest = globalThis.Request
class BaseUrlRequest extends OriginalRequest {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    super(
      typeof input === 'string' && input.startsWith('/') ? `http://localhost${input}` : input,
      init,
    )
  }
}

const ME_PASSWORD = '/api/v1/frontend/auth/me/password'
const ME = '/api/v1/frontend/auth/me'
const REFRESH = '/api/v1/public/auth/refresh'

function jsonResponse(status: number, body?: unknown) {
  return body === undefined
    ? new Response(null, { status })
    : new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

/** 后端对「密码确认错」的真实回包(AppError::InvalidCredentials)。 */
const invalidCredentials = () => jsonResponse(401, { code: 'invalid_credentials', error: 'Authentication failed' })
/** 后端对「token 失效 / 没登录」的真实回包(AppError::Unauthorized)。 */
const sessionExpired = () => jsonResponse(401, { code: 'unauthorized', error: 'Authentication failed' })

let client: typeof import('@/generated/client')
let navigate: ReturnType<typeof vi.fn>
let queryClient: QueryClient
let calls: string[]

beforeEach(async () => {
  vi.stubGlobal('Request', BaseUrlRequest)
  vi.stubGlobal('fetch', fetchMock)
  // api-client 有模块级状态(authFailureHandled / refreshPromise):每条用例一份干净的模块。
  vi.resetModules()
  client = await import('@/generated/client')
  const { globalRouter } = await import('@/lib/global-router')
  const { queryKeys } = await import('@/lib/query-keys')

  navigate = vi.fn()
  queryClient = new QueryClient()
  queryClient.setQueryData(queryKeys.auth.me(), { id: 'u1', username: 'alice', roles: [] })
  queryClient.setQueryData(['widgets', 'list'], { items: ['row-1'] })
  globalRouter.instance = {
    navigate,
    options: { context: { queryClient } },
    state: { location: { pathname: '/admin/profile' } },
  } as unknown as typeof globalRouter.instance

  calls = []
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
  fetchMock.mockReset()
  h.toastError.mockReset()
})

function record(handler: (request: Request) => Response) {
  fetchMock.mockImplementation(async (input) => {
    const request = input as Request
    calls.push(`${request.method} ${new URL(request.url).pathname}`)
    return handler(request)
  })
}

async function flushTimers() {
  // handleAuthFailure 的 toast 推到 setTimeout(0) 之后;等它一拍再断言「没弹」。
  await new Promise(resolve => setTimeout(resolve, 0))
}

function expectSessionUntouched() {
  expect(navigate).not.toHaveBeenCalled()
  expect(h.toastError).not.toHaveBeenCalled()
  expect(queryClient.getQueryData(['widgets', 'list'])).toEqual({ items: ['row-1'] })
  expect(queryClient.getQueryData(['auth', 'me'])).toMatchObject({ username: 'alice' })
}

describe('wrong password on change-password / delete-me is a caller error, not an expired session', () => {
  it('change password with the wrong current password rejects to the caller without refresh, redirect or cache clear', async () => {
    record(() => invalidCredentials())

    const error = await client
      .changePassword({ body: { current_password: 'wrong', new_password: 'newpass456' } })
      .then(() => null, (e: unknown) => e as ApiErrorClass)

    expect(error).toMatchObject({ code: 'invalid_credentials', status: 401, message: 'Authentication failed' })
    expect(calls).toEqual([`POST ${ME_PASSWORD}`])
    await flushTimers()
    expectSessionUntouched()
  })

  it('delete me with the wrong password rejects to the caller without refresh, redirect or cache clear', async () => {
    record(() => invalidCredentials())

    await expect(client.deleteMe({ body: { password: 'wrong' } })).rejects.toMatchObject({
      code: 'invalid_credentials',
      status: 401,
    })
    expect(calls).toEqual([`DELETE ${ME}`])
    await flushTimers()
    expectSessionUntouched()
  })

  it('an expired access token on change password still refreshes and retries', async () => {
    record((request) => {
      if (request.url.endsWith(REFRESH)) {
        return jsonResponse(200, { id: 'u1', username: 'alice', roles: [] })
      }
      return request.headers.get('x-retried-after-refresh') === '1' ? jsonResponse(204) : sessionExpired()
    })

    await expect(
      client.changePassword({ body: { current_password: 'pwd', new_password: 'newpass456' } }),
    ).resolves.toBeUndefined()
    expect(calls).toEqual([`POST ${ME_PASSWORD}`, `POST ${REFRESH}`, `POST ${ME_PASSWORD}`])
    await flushTimers()
    expectSessionUntouched()
  })

  it('expired token, then the refreshed retry says wrong password: still a caller error', async () => {
    record((request) => {
      if (request.url.endsWith(REFRESH)) {
        return jsonResponse(200, { id: 'u1', username: 'alice', roles: [] })
      }
      return request.headers.get('x-retried-after-refresh') === '1' ? invalidCredentials() : sessionExpired()
    })

    await expect(
      client.changePassword({ body: { current_password: 'wrong', new_password: 'newpass456' } }),
    ).rejects.toMatchObject({ code: 'invalid_credentials', status: 401 })
    expect(calls).toEqual([`POST ${ME_PASSWORD}`, `POST ${REFRESH}`, `POST ${ME_PASSWORD}`])
    await flushTimers()
    expectSessionUntouched()
  })

  it('a truly dead session on change password still ends in the session-expired flow', async () => {
    record(() => sessionExpired())

    await expect(
      client.changePassword({ body: { current_password: 'pwd', new_password: 'newpass456' } }),
    ).rejects.toMatchObject({ code: 'unauthorized', status: 401 })
    expect(calls).toEqual([`POST ${ME_PASSWORD}`, `POST ${REFRESH}`])
    await flushTimers()
    expect(navigate).toHaveBeenCalledWith({ to: '/admin/login' })
    expect(h.toastError).toHaveBeenCalledTimes(1)
    expect(queryClient.getQueryData(['widgets', 'list'])).toBeUndefined()
    expect(queryClient.getQueryData(['admin', 'auth', 'me'])).toBeNull()
  })
})
