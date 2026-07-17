import { createFileRoute } from '@tanstack/react-router'

import { TenantAdminPage } from '@/business/tenant/tenant-admin-page'

// 平台租户管理(superadmin)。准入随主数据操作 listTenants(= tenants:admin + admin:login):
// 缺 tenants:admin 时菜单不出现、直连进壳内 403。
export const Route = createFileRoute('/admin/_shell/tenants')({
  component: TenantAdminPage,
  staticData: {
    titleKey: 'titles.adminTenants',
    menuTitleKey: 'titles.adminTenants',
    icon: 'i-tabler-building',
    groupKey: 'menuGroups.admin',
    accessPolicyKeys: ['listTenants'],
  },
})
