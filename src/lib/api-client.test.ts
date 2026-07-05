// @vitest-environment happy-dom

import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { requestJson } from './api-client'
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
  globalRouter.instance = {
    navigate,
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
})

it('shares one refresh across concurrent 401s', async () => {
  let refreshCalls = 0
  fetchMock.mockImplementation(async (input) => {
    const request = input as Request
    if (request.url.endsWith('/auth/refresh')) {
      refreshCalls += 1
      await new Promise((resolve) => setTimeout(resolve, 10))
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
