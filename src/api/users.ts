import { useQuery } from '@tanstack/react-query'

import type { AdminUserView, ListUsersQuery } from '#/generated/api-types'
import { listUsers as listUsersApi } from '#/generated/client'
import {
  useInfiniteCursorList,
  type BaseInfiniteListOptions,
} from '#/components/select/use-infinite-list'
import { queryKeys } from '#/lib/query-keys'

export function useUsers(request?: ListUsersQuery, options?: { enabled?: boolean }) {
  return useQuery({
    enabled: options?.enabled ?? true,
    queryFn: () => listUsersApi({ query: request }),
    queryKey: queryKeys.users.list(request),
  })
}

export interface UseInfiniteUserOptionsOptions extends BaseInfiniteListOptions {
  /** Username substring (ILIKE). Blank input is normalized to undefined. */
  search?: string
}

/**
 * Infinite user options for select-like UI, keyset (cursor) paginated.
 *
 * `list_users` picks its mode by the `cursor` param: an empty `cursor=` seeds the
 * first keyset page (`after=None`), then each response's `next_cursor` walks the
 * rest. The first page sends `cursor: ''` explicitly — the generic hook omits the
 * cursor when there's no page param, so we default it here. Search maps to
 * `username` (the safe substring filter — `q`/display-name search 422s without a
 * search backend).
 */
export function useInfiniteUserOptions(options: UseInfiniteUserOptionsOptions = {}) {
  const { search, ...rest } = options
  const username = search?.trim() || undefined

  return useInfiniteCursorList<AdminUserView, { username?: string }>({
    ...rest,
    queryKey: queryKeys.users.optionsInfiniteList({ username }),
    queryFn: ({ limit, cursor, username: usernameParam }) =>
      listUsersApi({
        query: {
          size: limit,
          cursor: cursor ?? '',
          ...(usernameParam ? { username: usernameParam } : {}),
        },
      }).then((res) => ({
        items: res.items,
        nextCursor:
          res.page_info.mode === 'cursor' ? (res.page_info.next_cursor ?? undefined) : undefined,
      })),
    baseParams: { username },
  })
}
