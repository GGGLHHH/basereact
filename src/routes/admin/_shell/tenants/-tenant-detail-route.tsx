import { getRouteApi } from '@tanstack/react-router'

import { TenantDetailPage } from '@/business/tenant/tenant-detail-page'

const route = getRouteApi('/admin/_shell/tenants/$tenantId')

export function TenantDetailRoute() {
  const { tenantId } = route.useParams()
  return (
    <TenantDetailPage
      // 换租户强制重挂载:成员表分页等局部 state 不串到下一个租户。
      key={tenantId}
      tenantId={tenantId}
    />
  )
}
