import { createFileRoute } from '@tanstack/react-router'

import { AdminNoTenantPage } from './-no-tenant-page'

// 「还没加入任何组织」(spec §4.2)。守卫(requireAdmin)见探针 403 tenant_required、
// 或任一租户级接口回 tenant_required(api-client)时把人带到这里。页面只有文案和登出,
// 匿名访问也无害,按公开页处理。
export const Route = createFileRoute('/admin/no-tenant')({
  component: AdminNoTenantPage,
  staticData: {
    titleKey: 'titles.noTenant',
    accessPublic: true,
  },
})
