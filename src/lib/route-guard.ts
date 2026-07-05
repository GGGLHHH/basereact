import { redirect } from '@tanstack/react-router'

import type { QueryClient } from '@tanstack/react-query'
import type { ParsedLocation } from '@tanstack/react-router'
import type { UserResponse } from '#/generated/api-types'

import { adminGetMe, getMe } from '#/generated/client'
import { myPermissionsQueryOptions } from '#/api/auth'
import { declaresAccessPolicy, isStaticDataGranted } from '#/lib/access-control'
import { ApiErrorClass, AUTH_PROBE_HEADER, LOGIN_ROUTE } from '#/lib/api-client'
import { globalRouter } from '#/lib/global-router'
import { queryKeys } from '#/lib/query-keys'

/**
 * 守卫只吃目标 location 的 pathname/search——结构化最小类型,测试免造完整
 * ParsedLocation。匹配链在这里(路由树之外的模块)用 matchRoutes 现算:
 * 非弃用重载 (pathname, search) 返回 MakeRouteMatchUnion,该类型引整棵
 * 路由树,在路由文件的 initializer 里消费会 TS7022 自引用。
 */
export type GuardLocation = Pick<ParsedLocation, 'pathname' | 'search'>

// 缓存三态:UserResponse=已登录;null=显式匿名(登出 / 终态 401 写入,免探针直转登录);
// undefined=未知,发探针。staleTime 走 QueryClient 全局默认(5min),不另设真源。

/**
 * admin 区准入闸(_shell beforeLoad)。两级:
 * 1) 登录/角色门:探针 = adminGetMe(后端 gate 在 users:admin),前端不自行推角色——
 *    200 放行 / 401 转登录 / 403 转全屏 403。
 * 2) 细粒度权限门:匹配链上声明了 accessPolicyKeys/anyOf 的路由,按有效权限集
 *    (getMyPermissions)判定,缺权限转壳内 /admin/403。见下方注释与 access-control.ts。
 * 探针带 AUTH_PROBE_HEADER:刷新梯照常续期重试,但终态 401 不做命令式跳转,
 * redirect 单一归属这里——hover 预加载跑到本函数时,抛出的 redirect 会被
 * preload 语义吞掉,用户不会被悬停拽走。
 * ensureQueryData + revalidateIfStale:缓存过期时即刻放行、后台再验,
 * 壳内导航不被探针往返阻塞;真正的会话死亡由下一个真实 API 调用的刷新梯兜底。
 */
export async function requireAdmin(
  queryClient: QueryClient,
  location: GuardLocation,
): Promise<{ me: UserResponse }> {
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

    // 细粒度权限:匹配链上有声明才取权限集(懒取,未声明的路由零额外请求)。
    // 层间 AND,层内公式见 access-control.ts。缺权限进壳内 403(已登录,
    // 留导航);探针 403(非管理员)才去全屏 /403。403 页自身无声明,不会循环。
    // instance 在 getRouter 建 router 时登记,beforeLoad(admin 子树纯客户端)
    // 时必非 null;?? [] 是 SSR 语义上的死分支兜底。
    const declared = (globalRouter.instance?.matchRoutes(location.pathname, location.search) ?? [])
      .map((match) => match.staticData)
      .filter((staticData) => declaresAccessPolicy(staticData))
    if (declared.length > 0) {
      const { permissions } = await queryClient.ensureQueryData({
        ...myPermissionsQueryOptions,
        revalidateIfStale: true,
      })
      if (!declared.every((staticData) => isStaticDataGranted(staticData, permissions))) {
        throw redirect({ to: '/admin/403' })
      }
    }

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

/**
 * frontend(公开站)准入闸,挂在需登录的叶子(/frontend/about)。无权限层——
 * frontend surface 只有登录/匿名两态,细粒度权限归 admin。探针 = getMe(带
 * AUTH_PROBE_HEADER:刷新梯照常续期重试,但终态 401 只抛错,重定向单一归属这里,
 * 约束同 requireAdmin)。缓存三态同 admin:null=显式匿名直转登录,免探针。
 */
export async function requireUser(queryClient: QueryClient): Promise<{ me: UserResponse }> {
  const cached = queryClient.getQueryData<UserResponse | null>(queryKeys.auth.me())
  if (cached === null) {
    throw redirect({ to: '/frontend/login' })
  }

  try {
    const me = await queryClient.ensureQueryData({
      queryFn: () => getMe({}, { headers: { [AUTH_PROBE_HEADER]: '1' } }),
      queryKey: queryKeys.auth.me(),
      revalidateIfStale: true,
    })
    return { me }
  } catch (error) {
    const status = error instanceof ApiErrorClass ? error.status : undefined
    if (status === 401) {
      queryClient.setQueryData(queryKeys.auth.me(), null)
      throw redirect({ to: '/frontend/login' })
    }
    throw error
  }
}

/**
 * frontend 登录页 guest 闸:纯缓存,零网络。本 tab 已登录才重定向去首页;
 * 冷缓存/匿名直接放行。SSR 安全(服务端缓存空,不误跳),登录页因此可保持 SSR。
 */
export function requireUserGuest(queryClient: QueryClient): void {
  const cached = queryClient.getQueryData<UserResponse | null>(queryKeys.auth.me())
  if (cached) {
    throw redirect({ to: '/frontend/home' })
  }
}
