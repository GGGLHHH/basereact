import type { AdminMenuGroup } from '@/lib/route-menu'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useMemo } from 'react'
import { myPermissionsQueryOptions } from '@/api/auth'
import { buildAdminMenu } from '@/lib/route-menu'

/**
 * 后台菜单树(按权限裁剪),侧栏和面包屑共用一份。
 *
 * 权限集与守卫共用一份缓存(同 queryKey);守卫若已按需取过则零请求。未加载时
 * permissions 为 undefined,落 buildAdminMenu 的 `= []` 默认参:声明了准入的条目
 * fail-closed 先隐藏。
 */
export function useAdminMenu(): AdminMenuGroup[] {
  const router = useRouter()
  const { data: myPermissions } = useQuery(myPermissionsQueryOptions)
  const permissions = myPermissions?.permissions
  // spread:FileRoutesById 是 interface(无隐式索引签名),摊成对象字面量
  // 才能零 cast 匹配 Record<string, MenuSourceRoute>。
  return useMemo(
    () => buildAdminMenu({ ...router.routesById }, permissions),
    [router, permissions],
  )
}
