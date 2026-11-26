import type { QueryClient } from '@tanstack/react-query'

import type {
  CreateTenantRequest,
  ListTenantMembersQuery,
  ListTenantsQuery,
  MemberView,
  Page_MemberView,
  Page_TenantView,
  TenantRoleName,
  TenantView,
  UpdateTenantRequest,
} from '@/generated/api-types'
import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import {
  createTenant as createTenantApi,
  getTenant as getTenantApi,
  listTenantMembers as listTenantMembersApi,
  listTenants as listTenantsApi,
  putTenantMember as putTenantMemberApi,
  removeTenantMember as removeTenantMemberApi,
  updateTenant as updateTenantApi,
} from '@/generated/client'
import { queryKeys } from '@/lib/query-keys'

// 平台租户管理(平台级 tenants:admin)。缓存同步同 optimistic-cache-updates:
// 改名 / 停用用返回值补丁列表行 + detail,再静默失效;新建、加成员发生在弹窗里、列表仍挂着,
// 用默认 refetch 让新行立刻出现(落在哪一页只有服务端知道)。
const TENANTS_LIST_KEY = [...queryKeys.tenants.all, 'list']

function patchTenantInLists(queryClient: QueryClient, tenant: TenantView): void {
  queryClient.setQueriesData<Page_TenantView>({ queryKey: TENANTS_LIST_KEY }, old =>
    old ? { ...old, items: old.items.map(t => (t.id === tenant.id ? tenant : t)) } : old)
}

function patchTenantMember(queryClient: QueryClient, tenantId: string, member: MemberView): void {
  queryClient.setQueriesData<Page_MemberView>({ queryKey: queryKeys.tenants.members(tenantId) }, old =>
    old ? { ...old, items: old.items.map(m => (m.id === member.id ? member : m)) } : old)
}

function removeTenantMemberFromLists(queryClient: QueryClient, tenantId: string, userId: string): void {
  queryClient.setQueriesData<Page_MemberView>({ queryKey: queryKeys.tenants.members(tenantId) }, old =>
    old ? { ...old, items: old.items.filter(m => m.id !== userId) } : old)
}

// 平台管理员自己也可能是这个租户的成员:本租户「成员」页、租户切换器里的名字都可能受影响。
// 只标脏不重取 —— 不确定是不是同一个租户,让它们下次访问时自己校正。
function markTenantScopedCachesStale(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.members.all, refetchType: 'none' })
  void queryClient.invalidateQueries({ queryKey: queryKeys.auth.tenants(), refetchType: 'none' })
}

export function useTenants(request?: ListTenantsQuery) {
  return useQuery({
    placeholderData: keepPreviousData,
    queryFn: () => listTenantsApi({ query: request }),
    queryKey: queryKeys.tenants.list(request),
  })
}

// 详情预取(路由 loader)与页面 hook 共用同一 queryFn / key。
export function tenantQueryOptions(id: string) {
  return queryOptions({
    queryFn: () => getTenantApi({ path: { id } }),
    queryKey: queryKeys.tenants.detail(id),
  })
}

export function useTenant(id: string) {
  return useQuery(tenantQueryOptions(id))
}

export function useCreateTenant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: CreateTenantRequest) => createTenantApi({ body: request }),
    onSuccess: (tenant) => {
      queryClient.setQueryData(queryKeys.tenants.detail(tenant.id), tenant)
      void queryClient.invalidateQueries({ queryKey: TENANTS_LIST_KEY })
    },
  })
}

/** 改名 / 停用 / 恢复(PUT 全量:name + status)。 */
export function useUpdateTenant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, request }: { id: string, request: UpdateTenantRequest }) =>
      updateTenantApi({ body: request, path: { id } }),
    onSuccess: (tenant) => {
      patchTenantInLists(queryClient, tenant)
      queryClient.setQueryData(queryKeys.tenants.detail(tenant.id), tenant)
      void queryClient.invalidateQueries({ queryKey: TENANTS_LIST_KEY, refetchType: 'none' })
      markTenantScopedCachesStale(queryClient)
    },
  })
}

export function useTenantMembers(tenantId: string, request?: ListTenantMembersQuery) {
  return useQuery({
    placeholderData: keepPreviousData,
    queryFn: () => listTenantMembersApi({ path: { id: tenantId }, query: request }),
    queryKey: queryKeys.tenants.memberList(tenantId, request),
  })
}

/** 设某账号在某租户里的角色;不是成员就加进去(PUT,全量替换角色)。 */
export function usePutTenantMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ tenantId, userId, roles }: { tenantId: string, userId: string, roles: TenantRoleName[] }) =>
      putTenantMemberApi({ body: { roles }, path: { id: tenantId, user_id: userId } }),
    onSuccess: (member, { tenantId }) => {
      patchTenantMember(queryClient, tenantId, member)
      // 可能是新加的人:默认 refetch,让他立刻出现在仍挂着的成员表里。
      void queryClient.invalidateQueries({ queryKey: queryKeys.tenants.members(tenantId) })
      markTenantScopedCachesStale(queryClient)
    },
  })
}

export function useRemoveTenantMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ tenantId, userId }: { tenantId: string, userId: string }) =>
      removeTenantMemberApi({ path: { id: tenantId, user_id: userId } }),
    onSuccess: (_data, { tenantId, userId }) => {
      removeTenantMemberFromLists(queryClient, tenantId, userId)
      void queryClient.invalidateQueries({ queryKey: queryKeys.tenants.members(tenantId), refetchType: 'none' })
      markTenantScopedCachesStale(queryClient)
    },
  })
}
