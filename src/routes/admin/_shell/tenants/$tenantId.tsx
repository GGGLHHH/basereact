import { createFileRoute } from '@tanstack/react-router'

import { tenantQueryOptions } from '@/api/tenants'

import { TenantDetailRoute } from './-tenant-detail-route'

// 租户详情,/admin/tenants/$tenantId(挂在 tenants 布局之下,叶子)。
export const Route = createFileRoute('/admin/_shell/tenants/$tenantId')({
  component: TenantDetailRoute,
  // 进页前取详情:缓存里有就直接用(staleTime 'static' = ensureQueryData 的语义,
  // ensureQueryData 本身已弃用)。列表刚看过则零请求。
  loader: ({ context, params }) =>
    context.queryClient.query({ ...tenantQueryOptions(params.tenantId), staleTime: 'static' }),
  staticData: {
    titleKey: 'titles.adminTenantDetail',
    accessPolicyKeys: ['getTenant'],
  },
})
