import { createFileRoute, redirect } from '@tanstack/react-router'

// /frontend 落地 → 首页,避免直接访问 /frontend 落在空 Outlet 上。
export const Route = createFileRoute('/frontend/')({
  beforeLoad: () => {
    throw redirect({ to: '/frontend/home' })
  },
})
