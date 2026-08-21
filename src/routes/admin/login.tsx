import { createFileRoute } from '@tanstack/react-router'

import { requireAdminGuest } from '@/lib/route-guard'

import { LoginPage } from './-login-page'

export const Route = createFileRoute('/admin/login')({
  // guest 闸:已是管理员直接去 /admin/home;探测失败一律放行(登录页必须可达)。
  beforeLoad: ({ context }) => requireAdminGuest(context.queryClient),
  component: LoginPage,
  staticData: {
    titleKey: 'titles.adminLogin',
    accessPublic: true,
  },
})
