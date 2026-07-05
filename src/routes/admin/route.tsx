import { Outlet, createFileRoute } from '@tanstack/react-router'

import { Spinner } from '@/components/ui/spinner'

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

function AdminPending() {
  return (
    <div className='flex min-h-svh items-center justify-center'>
      <Spinner className='size-6' />
    </div>
  )
}

// ponytail: 纯 Outlet 壳。有 auth 后在 beforeLoad 加登录态守卫。
function AdminLayout() {
  return <Outlet />
}
