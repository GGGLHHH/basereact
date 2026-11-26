import { LayersIcon } from '@gedatou/cadenza-icons'
import { createFileRoute } from '@tanstack/react-router'

// 平台「租户管理」区:/admin/tenants。纯布局(无 component → 默认 <Outlet/>),列表 / 详情
// 是子路由,面包屑因此带上可点的父级。菜单标题、图标、分组、准入都挂这里;准入 = listTenants
// (平台级 tenants:admin)—— 区内所有操作权限集相同,AND 到子路由上是恒等。
export const Route = createFileRoute('/admin/_shell/tenants')({
  staticData: {
    titleKey: 'titles.adminTenants',
    menuTitleKey: 'titles.adminTenants',
    icon: LayersIcon,
    groupKey: 'menuGroups.admin',
    accessPolicyKeys: ['listTenants'],
  },
})
