import type { QueryClient } from '@tanstack/react-query'
import type { LinkProps } from '@tanstack/react-router'
import type {
  ChangePasswordRequest,
  DeleteMeRequest,
  LoginRequest,
  RegisterRequest,
  UserResponse,
} from '@/generated/api-types'

import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'

import {
  adminGetMe as adminGetMeApi,
  adminLogin as adminLoginApi,
  changePassword as changePasswordApi,
  deleteMe as deleteMeApi,
  getMe as getMeApi,
  getMyPermissions as getMyPermissionsApi,
  listMyTenants as listMyTenantsApi,
  login as loginApi,
  logoutAll as logoutAllApi,
  logout as logoutApi,
  register as registerApi,
  switchTenant as switchTenantApi,
} from '@/generated/client'
import { AUTH_PROBE_HEADER, SOFT_AUTH_HEADER } from '@/lib/api-client'
import { queryKeys } from '@/lib/query-keys'
import { broadcastSessionChanged, leaveEndedSession, refreshSession } from '@/lib/session-sync'

// ---- admin surface (admin/auth/*) ----
// beforeLoad 守卫的探针在 lib/route-guard.ts(带 AUTH_PROBE_HEADER,不走 hook)。

// 有效权限集(role 展开 ∩ scope,wire 串)。守卫(ensureQueryData)与菜单裁剪
// (useQuery)共用同一份缓存。探针头:会话死亡时终态 401 只抛错,跳转归守卫。
export const myPermissionsQueryOptions = queryOptions({
  queryFn: () => getMyPermissionsApi({}, { headers: { [AUTH_PROBE_HEADER]: '1' } }),
  queryKey: queryKeys.admin.auth.permissions(),
})

export function useAdminMe(options?: { enabled?: boolean }) {
  return useQuery({
    enabled: options?.enabled ?? true,
    queryFn: () => adminGetMeApi({}),
    queryKey: queryKeys.admin.auth.me(),
  })
}

export function useAdminLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: LoginRequest) => adminLoginApi({ body: request }),
    onSuccess: () => {
      // 清空**全部**缓存:可能换了账号 / 换了组织,上一个会话缓存的列表(成员、组件……)
      // 一条都不能在新会话里渲染出来;登出留下的 null 标记也一并清掉。
      // 不用 adminLogin 响应直接种 me:进壳时让守卫真正打一次 adminGetMe(users:admin 门)——
      // adminLogin 若不校验角色,种缓存会让非管理员绕过探针混进后台壳(复审 #5)。
      // 本页随后导航离开登录页,清空即可;共享 cookie 换了会话,通知其他标签页按新会话刷新。
      queryClient.clear()
      broadcastSessionChanged('login')
    },
  })
}

// ---- frontend/public surface ----

// 公开页导航栏的登录态探测:软探针(SOFT_AUTH_HEADER),匿名 401 只报错、
// 不触发刷新梯/命令式跳转——公开页的匿名访客不该被一次注定失败的探测弹走。
// 与 requireUser 守卫(AUTH_PROBE_HEADER)共用 auth.me 缓存:守卫一旦填充,导航即同步。
export const meSoftQueryOptions = queryOptions({
  queryFn: () => getMeApi({}, { headers: { [SOFT_AUTH_HEADER]: '1' } }),
  queryKey: queryKeys.auth.me(),
})

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: LoginRequest) => loginApi({ body: request }),
    onSuccess: (user) => {
      // 同 useAdminLogin:换了账号 / 组织,先清空全部缓存,再种本次登录的 me。
      queryClient.clear()
      queryClient.setQueryData(queryKeys.auth.me(), user)
      broadcastSessionChanged('login')
    },
  })
}

// ---- 租户(两个 surface 共用:cookie 里只有一个当前租户) ----

// 我的有效成员关系(租户 active + 成员 active),最近用过的在前,current 标出当前租户。
const myTenantsQueryOptions = queryOptions({
  queryFn: () => listMyTenantsApi({}),
  queryKey: queryKeys.auth.tenants(),
})

// soft:软探测(SOFT_AUTH_HEADER)—— 给可能被匿名访问的页面(如 /403)用,401 只报错,
// 不走刷新梯、不跳登录页。与常规版共用同一份缓存。
export function useMyTenants(options?: { enabled?: boolean, soft?: boolean }) {
  return useQuery({
    ...myTenantsQueryOptions,
    ...(options?.soft === true
      ? { queryFn: () => listMyTenantsApi({}, { headers: { [SOFT_AUTH_HEADER]: '1' } }) }
      : {}),
    enabled: options?.enabled ?? true,
  })
}

/**
 * 切换当前租户(POST /frontend/auth/switch-tenant,后端换 session + 写 cookie)。
 * 成功后:广播给其他标签页 → refreshSession:**全部**查询就地重置(上一个租户的数据当场从页面
 * 消失,正在显示的立刻按新租户重取)+ router.invalidate()(守卫按新租户重跑)。
 * 不用 clear():已挂载的 useQuery 会绑在被删掉的旧查询上,不重取(复审 #1,见 lib/session-sync.ts)。
 */
export function useSwitchTenant() {
  const queryClient = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: (tenantId: string) => switchTenantApi({ body: { tenant_id: tenantId } }),
    onSuccess: async () => {
      broadcastSessionChanged('tenant-switched')
      await refreshSession(queryClient, router)
    },
  })
}

export const FRONTEND_HOME = '/frontend/home' satisfies LinkProps['to']
export const FRONTEND_NO_TENANT = '/frontend/no-tenant' satisfies LinkProps['to']

/**
 * 公开站登录后的落点(spec §4.2):没有任何有效成员关系、也没有平台角色 →
 * 「还没加入任何组织」;其余照常进首页。读不到租户列表时按常规进首页 ——
 * 真缺租户的话,第一个租户级接口的 tenant_required 仍会把人带到空状态页。
 */
export async function frontendLandingAfterLogin(
  queryClient: QueryClient,
  user: UserResponse,
): Promise<typeof FRONTEND_HOME | typeof FRONTEND_NO_TENANT> {
  if (user.roles.length > 0) {
    return FRONTEND_HOME
  }
  try {
    const tenants = await queryClient.query(myTenantsQueryOptions)
    return tenants.length === 0 ? FRONTEND_NO_TENANT : FRONTEND_HOME
  }
  catch {
    return FRONTEND_HOME
  }
}

export function useRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: RegisterRequest) => registerApi({ body: request }),
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.auth.me(), user)
      // 注册成功即登录(后端写 auth cookie):同登录,通知其他标签页。
      broadcastSessionChanged('login')
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => logoutApi({}),
    onSuccess: () => {
      queryClient.clear()
      // 显式匿名标记:守卫见 null 直接转登录,不再发探针(避免登出后 401→refresh 连环)。
      queryClient.setQueryData(queryKeys.admin.auth.me(), null)
      // 共享 cookie 已清:其他标签页也回登录页。
      broadcastSessionChanged('logout')
    },
  })
}

export function useLogoutAll() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => logoutAllApi({}),
    onSuccess: () => {
      queryClient.clear()
      queryClient.setQueryData(queryKeys.admin.auth.me(), null)
      broadcastSessionChanged('logout')
    },
  })
}

/**
 * 改密码:后端撤销该账号的**全部**会话并清掉 auth cookie —— 本页的会话也随之结束,同登出。
 * 成功后广播 logout(其他标签页回登录页),本页按 leaveEndedSession 的顺序离开:先写匿名标记 →
 * 回所在 surface 的登录页(卸掉当前页面)→ 再清缓存。先 clear() 的话,导航途中重渲染的组件会以
 * 已失效的会话再发请求,401 触发刷新梯和「会话过期」提示(见 lib/session-sync.ts)。
 * 跳转由本 hook 负责,调用方不必再 navigate。
 *
 * 旧密码错:后端回 401 `invalid_credentials`(不是会话过期的 `unauthorized`),拦截器原样交给调用方 ——
 * 不刷新、不跳登录页、不清缓存,会话照旧;调用方从 mutation 的 error 里拿到它自己提示
 * (`error.code === INVALID_CREDENTIALS_CODE`,见 lib/api-client.ts)。
 */
export function useChangePassword() {
  const queryClient = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: (request: ChangePasswordRequest) => changePasswordApi({ body: request }),
    onSuccess: async () => {
      // 共享 cookie 已清:其他标签页也回登录页。
      broadcastSessionChanged('logout')
      await leaveEndedSession(queryClient, router)
    },
  })
}

/**
 * 注销账号(要密码确认)。密码错同改密码:401 `invalid_credentials` 交给调用方,会话照旧、不跳转。
 */
export function useDeleteMe() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: DeleteMeRequest) => deleteMeApi({ body: request }),
    onSuccess: () => {
      queryClient.clear()
      queryClient.setQueryData(queryKeys.admin.auth.me(), null)
      // 账号没了,会话随之结束:同登出。
      broadcastSessionChanged('logout')
    },
  })
}
