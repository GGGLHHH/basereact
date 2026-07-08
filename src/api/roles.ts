import { useQuery } from '@tanstack/react-query'

import type { RoleView } from '#/generated/api-types'
import { listRoles as listRolesApi } from '#/generated/client'
import {
  useInfiniteCursorList,
  type BaseInfiniteListOptions,
} from '#/components/select/use-infinite-list'
import { queryKeys } from '#/lib/query-keys'

// 全量角色目录(小而有界,单页返回)。用于按名→id 映射(编辑页回填用户当前角色)。
export function useRoles(options?: { enabled?: boolean }) {
  return useQuery({
    enabled: options?.enabled ?? true,
    queryFn: () => listRolesApi({}).then((res) => res.items),
    queryKey: queryKeys.roles.list(),
  })
}

/**
 * 无限角色候选(游标),给 role-infinite-select。后端一次返回全量存活角色
 * (has_more=false),故实际单页;无服务端角色搜索,过滤在前端做(见 role-infinite-select)。
 */
export function useInfiniteRoleOptions(options: BaseInfiniteListOptions = {}) {
  return useInfiniteCursorList<RoleView>({
    ...options,
    queryKey: queryKeys.roles.optionsInfiniteList(),
    queryFn: ({ limit, cursor }) =>
      listRolesApi({ query: { cursor: cursor ?? '', size: limit } }).then((res) => ({
        items: res.items,
        nextCursor:
          res.page_info.mode === 'cursor' ? (res.page_info.next_cursor ?? undefined) : undefined,
      })),
  })
}
