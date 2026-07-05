import { Outlet, createFileRoute } from '@tanstack/react-router'

// /frontend 落地布局:裸 Outlet。公开站默认 SSR(不设 ssr:false);顶部导航在
// _shell,登录页(/frontend/login)在 _shell 之外,不吃导航壳。
export const Route = createFileRoute('/frontend')({
  component: FrontendLayout,
})

function FrontendLayout() {
  return <Outlet />
}
