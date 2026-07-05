import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type {
  ChangePasswordRequest,
  DeleteMeRequest,
  LoginRequest,
  RegisterRequest,
  UpdateMeRequest,
} from '#/generated/api-types'

import {
  adminGetMe as adminGetMeApi,
  adminLogin as adminLoginApi,
  changePassword as changePasswordApi,
  deleteMe as deleteMeApi,
  getMe as getMeApi,
  getMyPermissions as getMyPermissionsApi,
  login as loginApi,
  logout as logoutApi,
  logoutAll as logoutAllApi,
  register as registerApi,
  updateMe as updateMeApi,
} from '#/generated/client'
import { AUTH_PROBE_HEADER } from '#/lib/api-client'
import { queryKeys } from '#/lib/query-keys'

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
      // 只清缓存(含登出留下的 null 标记),不用 adminLogin 响应直接种 me:
      // 进壳时让守卫真正打一次 adminGetMe(users:admin 门)——adminLogin 若不校验
      // 角色,种缓存会让非管理员绕过探针混进后台壳(复审 #5)。
      queryClient.removeQueries({ queryKey: queryKeys.admin.auth.all })
    },
  })
}

// ---- frontend/public surface ----

export function useMe(options?: { enabled?: boolean }) {
  return useQuery({
    enabled: options?.enabled ?? true,
    queryFn: () => getMeApi({}),
    queryKey: queryKeys.auth.me(),
  })
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: LoginRequest) => loginApi({ body: request }),
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.auth.me(), user)
    },
  })
}

export function useRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: RegisterRequest) => registerApi({ body: request }),
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.auth.me(), user)
    },
  })
}

export function useUpdateMe() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: UpdateMeRequest) => updateMeApi({ body: request }),
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.auth.me(), user)
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
    },
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (request: ChangePasswordRequest) => changePasswordApi({ body: request }),
  })
}

export function useDeleteMe() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: DeleteMeRequest) => deleteMeApi({ body: request }),
    onSuccess: () => {
      queryClient.clear()
      queryClient.setQueryData(queryKeys.admin.auth.me(), null)
    },
  })
}
