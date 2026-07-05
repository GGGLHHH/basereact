import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin')({
  component: AdminLayout,
  staticData: {
    titleKey: 'admin',
    hideInMenu: true,
  },
})

// ponytail: 纯 Outlet 壳。有 auth 后在 beforeLoad 加登录态守卫。
function AdminLayout() {
  return <Outlet />
}
