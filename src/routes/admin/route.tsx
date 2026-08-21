import { createFileRoute } from '@tanstack/react-router'

import { AdminLayout, AdminPending } from './-admin-layout'

export const Route = createFileRoute('/admin')({
  component: AdminLayout,
  // ssr:false 首屏在客户端等守卫探针,这里给占位。挂在 admin 层(顶层位置)
  // 而非全局 defaultPendingComponent:min-h-svh 的占位塞进壳内 Outlet 会
  // 把 64px header + 100svh 内容撑出视口(复审 #12)。
  pendingComponent: AdminPending,
  // 后台纯 SPA:整棵 /admin/* 子树不做 SSR(后代自动继承)。
  // beforeLoad/loader 因此只跑客户端,守卫无需 cookie 转发。
  ssr: false,
  staticData: {
    titleKey: 'titles.admin',
    hideInMenu: true,
  },
})
