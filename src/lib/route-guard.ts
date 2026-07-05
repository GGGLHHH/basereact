import { redirect } from '@tanstack/react-router'

import type { QueryClient } from '@tanstack/react-query'
import type { UserResponse } from '#/generated/api-types'

import { adminGetMe } from '#/generated/client'
import { ApiErrorClass, AUTH_PROBE_HEADER, LOGIN_ROUTE } from '#/lib/api-client'
import { queryKeys } from '#/lib/query-keys'

// 缓存三态:UserResponse=已登录;null=显式匿名(登出 / 终态 401 写入,免探针直转登录);
// undefined=未知,发探针。staleTime 走 QueryClient 全局默认(5min),不另设真源。

/**
 * admin 区准入闸(_shell beforeLoad)。探针 = adminGetMe(后端 gate 在 users:admin),
 * 前端不算权限:200 放行 / 401 转登录 / 403 转全屏 403。
 * 探针带 AUTH_PROBE_HEADER:刷新梯照常续期重试,但终态 401 不做命令式跳转,
 * redirect 单一归属这里——hover 预加载跑到本函数时,抛出的 redirect 会被
 * preload 语义吞掉,用户不会被悬停拽走。
 * ensureQueryData + revalidateIfStale:缓存过期时即刻放行、后台再验,
 * 壳内导航不被探针往返阻塞;真正的会话死亡由下一个真实 API 调用的刷新梯兜底。
 */
export async function requireAdmin(queryClient: QueryClient): Promise<{ me: UserResponse }> {
  const cached = queryClient.getQueryData<UserResponse | null>(queryKeys.admin.auth.me())
  if (cached === null) {
    throw redirect({ to: LOGIN_ROUTE })
  }

  try {
    const me = await queryClient.ensureQueryData({
      queryFn: () => adminGetMe({}, { headers: { [AUTH_PROBE_HEADER]: '1' } }),
      queryKey: queryKeys.admin.auth.me(),
      revalidateIfStale: true,
    })
    return { me }
  } catch (error) {
    const status = error instanceof ApiErrorClass ? error.status : undefined
    if (status === 401) {
      // 显式匿名标记:后续 /admin/* 访问零网络直转登录(登录成功会清掉)。
      queryClient.setQueryData(queryKeys.admin.auth.me(), null)
      throw redirect({ to: LOGIN_ROUTE })
    }
    if (status === 403) {
      throw redirect({ to: '/403' })
    }
    throw error
  }
}

/**
 * 登录页 guest 闸:纯缓存判断,零网络零阻塞——登录页必须永远可达,
 * 匿名访客(绝大多数)不为一次注定失败的探针等待首屏。
 * 本 tab 已登录(缓存有用户)才重定向;冷缓存/新 tab 直接放行,
 * 已登录管理员重复登录无害(登录动作本身会去 /admin/home)。
 */
export function requireAdminGuest(queryClient: QueryClient): void {
  const cached = queryClient.getQueryData<UserResponse | null>(queryKeys.admin.auth.me())
  if (cached) {
    throw redirect({ to: '/admin/home' })
  }
}
