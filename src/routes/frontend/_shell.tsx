import { createFileRoute } from '@tanstack/react-router'

import { FrontendShell } from './-shell'

// pathless 布局:公开站顶部导航壳。无守卫——home 公开,about 自带 requireUser。
// 登录态走软探针(匿名 401 不触发刷新梯/重定向,公开访客不被弹走)。
export const Route = createFileRoute('/frontend/_shell')({
  component: FrontendShell,
})
