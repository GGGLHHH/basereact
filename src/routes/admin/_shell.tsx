import { createFileRoute } from '@tanstack/react-router'

import { requireAdmin } from '@/lib/route-guard'

import { AdminShell } from './-shell-layout'

// sidebar-07 壳:登录页在 _shell 之外,不吃侧边栏。
// 准入闸在 beforeLoad(admin 子树 ssr:false,只跑客户端):
// 渲染前拦截,me 进 context——本组件的 NavUser 就是消费者。
export const Route = createFileRoute('/admin/_shell')({
  // 匹配链(根到叶)的 accessPolicyKeys/anyOf 由守卫按目标 location 现算并
  // 一处判定。不消费 ctx.matches:类型经 Register 引整棵路由树,在本文件
  // 消费必 TS7022 自引用(细节见 route-guard.ts)。
  beforeLoad: ({ context, location }) => requireAdmin(context.queryClient, location),
  component: AdminShell,
})
