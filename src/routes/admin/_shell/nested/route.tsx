import { createFileRoute } from '@tanstack/react-router'

import { NestedLayout } from './-nested-layout'

// 一级父路由:/admin/nested。route.tsx = 布局(标题 + Outlet 承载子路由),
// 同目录 index.tsx = 该路径自身的落地内容。菜单标题只挂在 route.tsx,
// index.tsx 不设 titleKey/menuTitle,免得面包屑/菜单出现同路径重复项。
export const Route = createFileRoute('/admin/_shell/nested')({
  component: NestedLayout,
  staticData: {
    titleKey: 'titles.nested',
    menuTitleKey: 'titles.nested',
    icon: 'i-tabler-stack-2',
    // 独立分组名与条目名区分开(否则 section "NESTED" 里又套一个 "Nested")。
    groupKey: 'menuGroups.demo',
    order: 3,
  },
})
