import { createFileRoute } from '@tanstack/react-router'

import { NestedOverview } from './-overview-page'

// 二级子路由(叶):/admin/nested/overview。一级父路由下的普通页面。
export const Route = createFileRoute('/admin/_shell/nested/overview')({
  component: NestedOverview,
  staticData: {
    titleKey: 'titles.nestedOverview',
    menuTitleKey: 'titles.nestedOverview',
    order: 0,
  },
})
