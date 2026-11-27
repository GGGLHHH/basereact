// Runtime contract for vite-plugin-openapi-codegen generated clients
// (src/generated/client.ts imports requestJson / requestVoid / ApiRequestOptions
// from here): ky setup, error normalization, the 401 refresh ladder and the
// tenant_required redirect.

import type { LinkProps } from '@tanstack/react-router'
import type { Options as KyOptions } from 'ky'
import type { ErrorBody, UserResponse } from '@/generated/api-types'

import i18next from 'i18next'
import ky, { isNetworkError, isTimeoutError } from 'ky'

import { toast } from 'sonner'
import { refresh as buildRefreshPath } from '@/generated/api'
import { globalRouter } from '@/lib/global-router'
import { queryKeys } from '@/lib/query-keys'

export const API_BASE_URL = '/api/v1'
export const LOGIN_ROUTE = '/admin/login' satisfies LinkProps['to']
/** 后端「没有当前租户」的错误码(ErrorBody.code):账号没有任何有效成员关系。 */
export const TENANT_REQUIRED_CODE = 'tenant_required' satisfies ErrorBody['code']
/**
 * 后端「凭据错」的错误码(ErrorBody.code,401):登录密码错、改密码旧密码错、注销密码确认错。
 * 会话本身还有效 —— 与会话失效的 401 `unauthorized` 不同,拦截器不刷新、不跳登录页,错误直接交给调用方。
 */
export const INVALID_CREDENTIALS_CODE = 'invalid_credentials' satisfies ErrorBody['code']
export const ADMIN_NO_TENANT_ROUTE = '/admin/no-tenant' satisfies LinkProps['to']
const FRONTEND_NO_TENANT_ROUTE = '/frontend/no-tenant' satisfies LinkProps['to']
const RETRIED_AFTER_REFRESH_HEADER = 'x-retried-after-refresh'

/**
 * 软探测标记:带此头的请求 401 时只抛 ApiError,不触发刷新梯、不跳登录页。
 * 给"未登录也合法"的探测用(公开页的 me 探测),匿名访客不该白打 refresh。
 */
export const SOFT_AUTH_HEADER = 'x-soft-auth-check'

/**
 * 守卫探针标记:401 照常走刷新梯续期重试,但终态失败只抛错,不做命令式跳转/
 * 匿名标记——重定向语义由 route-guard 单一归属。没有它,hover 预加载跑守卫
 * 探针时 handleAuthFailure 会把用户从悬停直接拽到登录页。
 */
export const AUTH_PROBE_HEADER = 'x-auth-probe'
// auth 端点自身的 401 不进刷新梯:login 是凭证错误,logout/refresh 本身就是会话终点。
// 改密码 / 注销的「密码不对」不靠路径认:按错误码 INVALID_CREDENTIALS_CODE 认(见 afterResponse 的 401 分支),
// 这两个接口的 token 失效 401(code = unauthorized)照常刷新重试。
const SKIP_REFRESH_SUFFIXES = ['/login', '/logout', '/logout-all', '/refresh']

export type ApiRequestOptions = KyOptions & {
  contentType?: string
}

export type ApiErrorKind = 'abort' | 'http' | 'network' | 'timeout'

let refreshPromise: Promise<void> | null = null
let authFailureHandled = false

export class ApiErrorClass extends Error {
  /** Machine-readable category from ErrorBody.code, e.g. not_found / validation / unauthorized */
  code?: string
  kind: ApiErrorKind
  status?: number

  constructor(
    message: string,
    options?: {
      code?: string
      kind?: ApiErrorKind
      status?: number
    },
  ) {
    super(message)
    this.name = 'ApiError'
    this.code = options?.code
    this.kind = options?.kind ?? 'http'
    this.status = options?.status

    Object.setPrototypeOf(this, ApiErrorClass.prototype)
  }
}

function shouldSkipRefresh(request: Request): boolean {
  return SKIP_REFRESH_SUFFIXES.some(suffix => request.url.endsWith(suffix))
}

function isLoginRequest(request: Request): boolean {
  return request.url.endsWith('/login')
}

function isAuthRecoveryRequest(request: Request): boolean {
  return isLoginRequest(request) || request.url.endsWith('/refresh')
}

function handleAuthFailure() {
  if (authFailureHandled) {
    return
  }
  authFailureHandled = true

  if (typeof window === 'undefined') {
    return
  }

  const router = globalRouter.instance

  // 终态 401 = 会话已死:清空全部缓存(下一个登录的可能是别的账号 / 组织,上一个会话的
  // 列表不能再渲染出来),再写显式匿名标记,守卫见 null 直转登录,
  // 不再在 staleTime 窗口内信任尸体缓存(否则 guest 闸会把用户弹回后台壳)。
  const queryClient = router?.options.context.queryClient
  queryClient?.clear()
  queryClient?.setQueryData(queryKeys.admin.auth.me(), null)

  // 会话终态失效:提示一次(authFailureHandled 已挡重复),再交给守卫/下面的跳转。
  // 本函数可能在路由初始 load/hydration 的 transition 内被 401 hook 同步调起;
  // sonner 的 toast 是同步 setState,此刻 Toaster 尚未 commit 会报
  // "update on a not-yet-mounted component"。推到 commit 之后的宏任务再弹。
  setTimeout(() => {
    toast.error(i18next.t('auth.session.expired'))
  }, 0)

  // ponytail: 要"回跳来源页"时,从 xchangeai-web 移植完整 handleAuthFailure。
  if (router) {
    if (router.state.location.pathname !== LOGIN_ROUTE) {
      void router.navigate({ to: LOGIN_ROUTE })
    }
    return
  }

  // router 尚未登记(极早期请求):整页跳转兜底。
  if (!window.location.pathname.startsWith(LOGIN_ROUTE)) {
    window.location.assign(LOGIN_ROUTE)
  }
}

/**
 * 租户级接口回 403 tenant_required = 这个账号当前没有租户(spec §4.2)。没有平台角色时
 * 带到所在 surface 的「还没加入任何组织」页;有平台角色 = 平台上下文,正常留在原处,
 * 错误照常交给调用方(平台角色取自已缓存的 me,两个 surface 任一份)。守卫探针 / 软探测不走这里
 * (redirect 单一归属 route-guard)。router 未登记(SSR / 极早期)时不动,调用方照常拿到错误。
 *
 * 登录请求也不走这里:后台登录对「没有任何有效成员关系、也没有平台权限」的账号直接回 403
 * tenant_required、不发 token —— 此时用户**没有登录**,空状态页的出口「登出」对他没有意义。
 * 这个错误由登录表单自己提示(LoginForm,auth.login.noTenant),人留在登录页。
 */
function handleTenantRequired() {
  const router = globalRouter.instance
  if (!router) {
    return
  }
  const queryClient = router.options?.context?.queryClient
  const hasPlatformRole = [queryKeys.admin.auth.me(), queryKeys.auth.me()].some(
    key => (queryClient?.getQueryData<UserResponse | null>(key)?.roles.length ?? 0) > 0,
  )
  if (hasPlatformRole) {
    return
  }
  const pathname = router.state.location.pathname
  const target = pathname.startsWith('/admin') ? ADMIN_NO_TENANT_ROUTE : FRONTEND_NO_TENANT_ROUTE
  if (pathname !== target) {
    void router.navigate({ to: target })
  }
}

function retryAfterRefresh(request: Request) {
  const headers = new Headers(request.headers)
  headers.set(RETRIED_AFTER_REFRESH_HEADER, '1')
  return ky.retry({
    code: 'AUTH_REFRESHED',
    delay: 0,
    request: new Request(request, { headers }),
  })
}

const api = ky.create({
  credentials: 'include',
  hooks: {
    afterResponse: [
      async ({ request, response }) => {
        if (response.ok && isAuthRecoveryRequest(request)) {
          // 登录/刷新成功 = 会话恢复,允许下一次失效再触发一次跳转。
          authFailureHandled = false
        }

        // 401 处理顺序(每支必须先于下一支):
        //   0. 软探测            → 直接抛,零副作用
        //   1. 凭据错(code = invalid_credentials:改密码旧密码错、注销密码错……)
        //                        → 直接抛,零副作用。会话还有效,不能当会话过期去刷新 / 跳登录页 / 清缓存;
        //                          刷新后重试才报凭据错(token 恰好过期 + 密码也输错)同样落在这一支
        //   2. /login 响应       → 直接抛(凭证错误,调用方自己展示)
        //   3. /logout*          → 抛 + 会话失效处理;/refresh 自身 401 只抛,
        //                          定罪交给 await ensureRefreshed 的发起方
        //   4. 刷新后重试仍 401   → 终态失败;守卫探针只抛(redirect 归 route-guard)
        //   5. 其余              → 刷新会话 + 重试一次
        if (response.status === 401) {
          const isProbe = request.headers.get(AUTH_PROBE_HEADER) === '1'
          const error = await createApiError(response)

          if (request.headers.get(SOFT_AUTH_HEADER) === '1') {
            throw error
          }

          if (error.code === INVALID_CREDENTIALS_CODE) {
            throw error
          }

          if (request.url.endsWith('/login')) {
            throw error
          }

          if (shouldSkipRefresh(request)) {
            if (!request.url.endsWith('/refresh')) {
              handleAuthFailure()
            }
            throw error
          }

          if (request.headers.get(RETRIED_AFTER_REFRESH_HEADER) === '1') {
            if (!isProbe) {
              handleAuthFailure()
            }
            throw error
          }

          try {
            await ensureRefreshed()
          }
          catch {
            if (!isProbe) {
              handleAuthFailure()
            }
            throw error
          }

          return retryAfterRefresh(request)
        }

        if (!response.ok) {
          const error = await createApiError(response)
          if (
            response.status === 403
            && error.code === TENANT_REQUIRED_CODE
            && !isLoginRequest(request)
            && request.headers.get(AUTH_PROBE_HEADER) !== '1'
            && request.headers.get(SOFT_AUTH_HEADER) !== '1'
          ) {
            handleTenantRequired()
          }
          throw error
        }
        return response
      },
    ],
  },
  prefix: API_BASE_URL,
  retry: {
    limit: 1,
    shouldRetry: () => false,
  },
  timeout: 300000, // 5 minutes
})

// 定义在 `api` 之后:它引用 api,而 api 是 const(不提升)。反向的引用没问题 ——
// api 的 hook 里调这个函数时,函数声明已经提升。
async function ensureRefreshed(): Promise<void> {
  // 并发 401 共享同一次刷新;失败的定罪(handleAuthFailure 与否)由 await 方决定,
  // 因为只有发起方知道自己是不是守卫探针。
  refreshPromise ??= api
    .post(buildRefreshPath())
    .then(() => undefined)
    .finally(() => {
      refreshPromise = null
    })

  return refreshPromise
}

export async function requestJson<T>(path: string, options: ApiRequestOptions): Promise<T> {
  try {
    return await api(path, options).json<T>()
  }
  catch (error) {
    throw createClientError(error)
  }
}

export async function requestVoid(path: string, options: ApiRequestOptions): Promise<void> {
  try {
    await api(path, options)
  }
  catch (error) {
    throw createClientError(error)
  }
}

async function createApiError(response: Response): Promise<ApiErrorClass> {
  let errorMessage = i18next.t('errors.requestFailedStatus', { status: response.status })
  let errorCode: string | undefined

  try {
    // Backend's unified error contract; codegen keeps this in sync with the spec.
    const errorData = (await response.clone().json()) as Partial<ErrorBody>
    if (errorData.error !== undefined && errorData.error !== '') {
      errorMessage = errorData.error
    }
    errorCode = errorData.code
  }
  catch {
    errorMessage = response.statusText || errorMessage
  }

  return new ApiErrorClass(errorMessage, {
    code: errorCode,
    kind: 'http',
    status: response.status,
  })
}

// 面向用户的错误文案:ApiErrorClass/Error 的 message 已是规范化后端文案(见
// createApiError),否则回退。给表单 toast 等调用方提取消息用。
export function getErrorMessage(error: unknown, fallback = i18next.t('errors.generic')): string {
  return error instanceof Error && error.message ? error.message : fallback
}

function createClientError(error: unknown): ApiErrorClass {
  if (error instanceof ApiErrorClass) {
    return error
  }

  if (isTimeoutError(error)) {
    return new ApiErrorClass(i18next.t('errors.timeout'), {
      kind: 'timeout',
    })
  }

  if (isAbortError(error)) {
    return new ApiErrorClass(i18next.t('errors.canceled'), {
      kind: 'abort',
    })
  }

  if (isNetworkError(error)) {
    return new ApiErrorClass(i18next.t('errors.network'), {
      kind: 'network',
    })
  }

  return new ApiErrorClass(i18next.t('errors.requestFailedRetry'), {
    kind: 'network',
  })
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === 'AbortError'
    : error instanceof Error && error.name === 'AbortError'
}
