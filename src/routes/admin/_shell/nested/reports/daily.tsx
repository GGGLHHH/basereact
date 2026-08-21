import { createFileRoute } from '@tanstack/react-router'

import { ReportsDaily } from './-daily-page'

// 三级子路由(叶):/admin/nested/reports/daily。二级父路由 reports 下的页面。
export const Route = createFileRoute('/admin/_shell/nested/reports/daily')({
  component: ReportsDaily,
  staticData: {
    titleKey: 'titles.nestedDaily',
    menuTitleKey: 'titles.nestedDaily',
    order: 0,
  },
})
