import { createFileRoute, redirect } from '@tanstack/react-router'

// /admin 落地:重定向到壳内首页。让面包屑的 "Admin" 级有可达目标,
// 且直接访问 /admin 不落在空 Outlet 上。
export const Route = createFileRoute('/admin/')({
  beforeLoad: () => {
    throw redirect({ to: '/admin/home' })
  },
})
