import type { AccessPolicyKey } from '@/generated/access-policies'
import { useQuery } from '@tanstack/react-query'

import { myPermissionsQueryOptions } from '@/api/auth'
import { isPolicyGranted } from '@/lib/access-control'

/**
 * 当前有效权限集(wire 串)。未加载时是空集(fail closed)。与守卫、菜单共用同一份缓存。
 * 给「看目标数据的条件闸」用(如持平台角色的账号要 platform:roles):这类闸不进 OpenAPI 的
 * 操作策略,只能直接看权限。
 */
export function useMyPermissions(): readonly string[] {
  const { data } = useQuery(myPermissionsQueryOptions)
  return data?.permissions ?? []
}

/**
 * 当前有效权限是否满足某个操作的准入策略(按钮显隐用;真正的拦截在后端)。
 *
 * 与守卫、菜单共用同一份权限缓存(同 queryKey),守卫已取过则零请求。未加载时按空集判
 * (fail closed):写操作按钮先不出现,加载后补上。
 */
export function usePolicyGranted(key: AccessPolicyKey): boolean {
  const { data } = useQuery(myPermissionsQueryOptions)
  return isPolicyGranted(key, data?.permissions ?? [])
}
