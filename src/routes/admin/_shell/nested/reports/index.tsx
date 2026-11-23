import { createFileRoute, redirect } from '@tanstack/react-router'

// /admin/nested/reports 是纯分组(route.tsx 的 isGroup):重定向到菜单里的第一个子页。
// 改了子页顺序要同步这里,route-menu.test 会校验。
export const Route = createFileRoute('/admin/_shell/nested/reports/')({
  beforeLoad: () => {
    throw redirect({ to: '/admin/nested/reports/daily' })
  },
})
