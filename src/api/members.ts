import type { QueryClient } from '@tanstack/react-query'

import type {
  AddMemberRequest,
  ListMembersQuery,
  MemberView,
  Page_MemberView,
  TenantRoleName,
} from '@/generated/api-types'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  addMember as addMemberApi,
  listMembers as listMembersApi,
  removeMember as removeMemberApi,
  setMemberRoles as setMemberRolesApi,
} from '@/generated/client'
import { queryKeys } from '@/lib/query-keys'

// 本租户成员(租户级 members:read / members:admin)。租户来自 token,请求里不带 tenant_id。
// 缓存同步按 optimistic-cache-updates:改角色 / 移除用服务端返回值就地补丁 + 静默失效;
// 加人用**默认** refetch —— 加人弹窗关掉后列表仍挂在页面上,新行排在哪一页只有服务端知道,
// 静默失效要等下次进页才看得到,不符合「加完就在列表里」的预期。
const MEMBERS_LIST_KEY = [...queryKeys.members.all, 'list']

/** 就地替换某成员在所有已缓存成员列表分页里的行。 */
export function patchMemberInLists(queryClient: QueryClient, member: MemberView): void {
  queryClient.setQueriesData<Page_MemberView>({ queryKey: MEMBERS_LIST_KEY }, old =>
    old ? { ...old, items: old.items.map(m => (m.id === member.id ? member : m)) } : old)
}

/** 从所有已缓存成员列表分页里移除某成员。 */
export function removeMemberFromLists(queryClient: QueryClient, userId: string): void {
  queryClient.setQueriesData<Page_MemberView>({ queryKey: MEMBERS_LIST_KEY }, old =>
    old ? { ...old, items: old.items.filter(m => m.id !== userId) } : old)
}

// 平台管理员可能正开着同一个租户的「租户管理 → 成员」:那边的缓存也标脏(不重取)。
function markPlatformMemberListsStale(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: [...queryKeys.tenants.all, 'members'], refetchType: 'none' })
}

export function useMembers(request?: ListMembersQuery) {
  return useQuery({
    // 翻页 / 搜索时保留上一页行,避免整表闪空。只在同一个组织里生效:切换组织时全部查询被
    // resetQueries 清成无数据(lib/session-sync.ts),后台壳又按组织 id 重新挂载页面(-shell-layout.tsx),
    // 新的 observer 没有「上一页」可留,旧组织的行不会被当成占位显示出来。
    placeholderData: keepPreviousData,
    queryFn: () => listMembersApi({ query: request }),
    queryKey: queryKeys.members.list(request),
  })
}

/** 按用户名把已有账号加进本租户。404 account_not_found / 409 已是成员由调用方按 code 提示。 */
export function useAddMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: AddMemberRequest) => addMemberApi({ body: request }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.members.all })
      markPlatformMemberListsStale(queryClient)
    },
  })
}

/** 改本租户里的角色(全量替换)。返回更新后的成员。 */
export function useSetMemberRoles() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, roles }: { userId: string, roles: TenantRoleName[] }) =>
      setMemberRolesApi({ body: { roles }, path: { user_id: userId } }),
    onSuccess: (member) => {
      patchMemberInLists(queryClient, member)
      void queryClient.invalidateQueries({ queryKey: queryKeys.members.all, refetchType: 'none' })
      markPlatformMemberListsStale(queryClient)
    },
  })
}

/** 移出本租户(账号本身不删;他在本租户的会话被吊销)。 */
export function useRemoveMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => removeMemberApi({ path: { user_id: userId } }),
    onSuccess: (_data, userId) => {
      removeMemberFromLists(queryClient, userId)
      void queryClient.invalidateQueries({ queryKey: queryKeys.members.all, refetchType: 'none' })
      markPlatformMemberListsStale(queryClient)
    },
  })
}
