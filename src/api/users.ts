import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'

import type {
  AdminUserView,
  CreateUserRequest,
  ListUsersQuery,
  Page_AdminUserView,
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

// 列表查询按 {page,size} 分片缓存,key 前缀 [users.all,'list'] 命中所有已缓存分页
// (不含 detail / options-infinite)。乐观更新:mutation 影响 AdminUserView(含富化的
// display_name/avatar,故 profile/头像也算)时,先就地打补丁列表行 + detail 让 UI 即刻反映
//(补丁用的是 mutation 返回的服务器真值,非猜测),再 invalidate 但 **refetchType:'none'**:
// 只标记 stale、**不立即重取**——否则默认会重取活跃查询,把刚种的乐观值覆盖(编辑页的
// detail 就是活跃的)。stale 标记让下次 mount/focus(refetchOnMount)时再取校正。
const USERS_LIST_KEY = [...queryKeys.users.all, 'list']

/** 就地替换/打补丁某用户在所有已缓存 users.list 分页里的行。 */
export function patchUserInLists(
  queryClient: QueryClient,
  id: string,
  patch: (user: AdminUserView) => AdminUserView,
): void {
  queryClient.setQueriesData<Page_AdminUserView>({ queryKey: USERS_LIST_KEY }, (old) =>
    old ? { ...old, items: old.items.map((u) => (u.id === id ? patch(u) : u)) } : old,
  )
}

/** 从所有已缓存 users.list 分页里移除某用户(删除乐观反映)。 */
export function removeUserFromLists(queryClient: QueryClient, id: string): void {
  queryClient.setQueriesData<Page_AdminUserView>({ queryKey: USERS_LIST_KEY }, (old) =>
    old ? { ...old, items: old.items.filter((u) => u.id !== id) } : old,
  )
}

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
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all, refetchType: 'none' })
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: UpdateUserRequest }) =>
      updateUserApi({ body: request, path: { id } }),
    onSuccess: (user, { id }) => {
      patchUserInLists(queryClient, id, () => user) // 乐观:列表行即刻替换
      queryClient.setQueryData(queryKeys.users.detail(id), user)
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all, refetchType: 'none' }) // 失活:下次重取
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteUserApi({ path: { id } }),
    onSuccess: (_data, id) => {
      removeUserFromLists(queryClient, id) // 乐观:列表行即刻消失
      // 删掉详情缓存:否则删除后浏览器后退,detail loader 会从缓存重放已删用户(幽灵)。
      queryClient.removeQueries({ queryKey: queryKeys.users.detail(id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all, refetchType: 'none' }) // 失活:下次重取
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
      patchUserInLists(queryClient, id, () => user) // 乐观:列表行即刻替换(新角色)
      queryClient.setQueryData(queryKeys.users.detail(id), user)
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all, refetchType: 'none' }) // 失活:下次重取
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
