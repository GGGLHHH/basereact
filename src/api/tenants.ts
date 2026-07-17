import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { SetActiveTenantRequest, UserResponse } from '#/generated/api-types'
import {
  listMyTenants as listMyTenantsApi,
  putActiveTenant as putActiveTenantApi,
} from '#/generated/client'
import { queryKeys } from '#/lib/query-keys'

// 租户 = 认证域(切租户 = 服务端重新铸币 + 轮换 cookie)。所以这些 hook 放在 auth 旁边、
// query-key 也归 auth 前缀。列表返回按加入顺序,恰好一条 `is_active`(后端以 claim 为准)。

export const myTenantsQueryOptions = queryOptions({
  queryFn: () => listMyTenantsApi({}),
  queryKey: queryKeys.auth.tenants(),
})

/** 我的租户列表。0 租户用户返回 `[]`(register 的常规出口)—— 前端据此渲染「你还没有租户」。 */
export function useMyTenants(options?: { enabled?: boolean }) {
  return useQuery({
    ...myTenantsQueryOptions,
    enabled: options?.enabled ?? true,
  })
}

/**
 * 切换激活租户。
 *
 * ## ⚠️ onSuccess 是**安全关键点**:必须清全部业务缓存
 *
 * 切租户后,内存里所有 widget/content 列表都还属于**旧公司** —— 不清就会把 A 公司的数据
 * 显示在 B 公司的界面里(串数据)。所以 `queryClient.clear()` 全清,而不是逐个 invalidate
 * (逐个漏一个就串)。这与后端「切租户后旧 access token 仍见旧租户直到过期」是同一道理的
 * 前端收口:宁可全量重拉,不冒串租户的险。
 *
 * 清完立即种上新 `me`(切换端点返回新 `UserResponse`,cookie 已整条轮换),避免导航守卫
 * 因为缓存空了又打一次 me。跳转回首页由调用方做(见切换器组件)——重新进页面即重新拉本租户数据。
 */
export function useSwitchTenant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: SetActiveTenantRequest) => putActiveTenantApi({ body: request }),
    onSuccess: (user: UserResponse) => {
      queryClient.clear()
      queryClient.setQueryData(queryKeys.auth.me(), user)
    },
  })
}
