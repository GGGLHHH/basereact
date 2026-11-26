import { useQuery } from '@tanstack/react-query'

import { myPermissionsQueryOptions, useAdminMe } from '@/api/auth'

/** 当前后台登录账号的 id(未加载时 undefined)。与守卫共用 admin me 缓存。 */
export function useCurrentUserId(): string | undefined {
  return useAdminMe().data?.id
}

/** 当前所在组织的 id(平台上下文 / 未加载时 undefined)。与守卫、菜单共用权限缓存。 */
export function useCurrentTenantId(): string | undefined {
  const { data } = useQuery(myPermissionsQueryOptions)
  return data?.tenant?.id ?? undefined
}
