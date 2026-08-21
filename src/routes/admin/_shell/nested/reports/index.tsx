import { createFileRoute } from '@tanstack/react-router'

import { ReportsIndex } from './-reports-index'

// 二级父路由的落地内容:命中 /admin/nested/reports 时渲染。无 titleKey。
export const Route = createFileRoute('/admin/_shell/nested/reports/')({
  component: ReportsIndex,
})
