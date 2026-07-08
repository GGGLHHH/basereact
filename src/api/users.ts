import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import type {
  AdminUserView,
  CreateUserRequest,
  ListUsersQuery,
  UpdateUserRequest,
} from '#/generated/api-types'
import {
  createUser as createUserApi,
  deleteUser as deleteUserApi,
  getUser as getUserApi,
  listUsers as listUsersApi,
  resetUserPassword as resetUserPasswordApi,
  setUserRoles as setUserRolesApi,
  updateUser as updateUserApi,
} from '#/generated/client'
import {
  useInfiniteCursorList,
  type BaseInfiniteListOptions,
} from '#/components/select/use-infinite-list'
import { queryKeys } from '#/lib/query-keys'

export function useUsers(request?: ListUsersQuery, options?: { enabled?: boolean }) {
  return useQuery({
    enabled: options?.enabled ?? true,
    // 翻页/改页长时保留上一页行,避免整表闪空 + loading 覆盖层(新 key 时 isPlaceholderData 而非 isPending)。
    placeholderData: keepPreviousData,
    queryFn: () => listUsersApi({ query: request }),
    queryKey: queryKeys.users.list(request),
  })
}

// 详情预取(路由 loader)与页面 hook 共用同一 queryFn/key,避免漂移。
export function userQueryOptions(id: string) {
  return queryOptions({
    queryFn: () => getUserApi({ path: { id } }),
    queryKey: queryKeys.users.detail(id),
  })
}

export function useUser(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    ...userQueryOptions(id),
    enabled: options?.enabled ?? Boolean(id),
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: CreateUserRequest) => createUserApi({ body: request }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: UpdateUserRequest }) =>
      updateUserApi({ body: request, path: { id } }),
    onSuccess: (user, { id }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
      queryClient.setQueryData(queryKeys.users.detail(id), user)
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteUserApi({ path: { id } }),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
      // 删掉详情缓存:否则删除后浏览器后退,detail loader 会从缓存重放已删用户(幽灵)。
      queryClient.removeQueries({ queryKey: queryKeys.users.detail(id) })
    },
  })
}

// 角色是独立端点(PUT /users/{id}/roles,全量替换)。返回更新后的 AdminUserView。
export function useSetUserRoles() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, roles }: { id: string; roles: string[] }) =>
      setUserRolesApi({ body: { roles }, path: { id } }),
    onSuccess: (user, { id }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
      queryClient.setQueryData(queryKeys.users.detail(id), user)
    },
  })
}

// 管理员重置密码(POST /users/{id}/password,无需旧密码)。返回 void。
export function useResetUserPassword() {
  return useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      resetUserPasswordApi({ body: { new_password: newPassword }, path: { id } }),
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
