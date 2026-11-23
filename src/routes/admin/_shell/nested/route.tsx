import { LayersIcon } from '@gedatou/cadenza-icons'
import { createFileRoute } from '@tanstack/react-router'

import { NestedLayout } from './-nested-layout'

// 一级父路由:/admin/nested。route.tsx = 布局(标题 + Outlet 承载子路由)。
// 它是纯分组(isGroup):没有自己的页面,同目录 index.tsx 把 /admin/nested 重定向到
// 第一个子页。菜单标题只挂在 route.tsx,免得面包屑/菜单出现同路径重复项。
export const Route = createFileRoute('/admin/_shell/nested')({
  component: NestedLayout,
  staticData: {
    titleKey: 'titles.nested',
    menuTitleKey: 'titles.nested',
    icon: LayersIcon,
    isGroup: true,
    // 独立分组名与条目名区分开(否则 section "NESTED" 里又套一个 "Nested")。
    groupKey: 'menuGroups.demo',
    order: 3,
  },
})
