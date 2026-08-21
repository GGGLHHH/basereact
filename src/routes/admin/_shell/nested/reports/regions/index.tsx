import { createFileRoute } from '@tanstack/react-router'

import { RegionsIndex } from './-regions-index'

// 三级父路由的落地内容:命中 /admin/nested/reports/regions 时渲染。无 titleKey。
export const Route = createFileRoute('/admin/_shell/nested/reports/regions/')({
  component: RegionsIndex,
})
