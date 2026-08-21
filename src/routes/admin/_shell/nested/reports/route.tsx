import { createFileRoute } from '@tanstack/react-router'

import { ReportsLayout } from './-reports-layout'

// 二级父路由:/admin/nested/reports。对上是 nested 的子,对下带 Outlet 承载三级路由——
// "父路由"和"子路由"身份可叠加,这就是多级嵌套的核心。
export const Route = createFileRoute('/admin/_shell/nested/reports')({
  component: ReportsLayout,
  staticData: {
    titleKey: 'titles.nestedReports',
    menuTitleKey: 'titles.nestedReports',
    icon: 'i-tabler-chart-bar',
    order: 1,
  },
})
