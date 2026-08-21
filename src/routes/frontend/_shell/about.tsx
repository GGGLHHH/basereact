import { createFileRoute } from '@tanstack/react-router'

import { requireUser } from '@/lib/route-guard'

import { AboutPage, AboutPending } from './-about-page'

// 仅本页 ssr:false:守卫探针只跑客户端,免 SSR 的 cookie 转发——公开 home/login
// 保持 SSR,只有这张登录门后的页退成客户端渲染。beforeLoad 拦在渲染前,me 进
// context 供本组件消费(同 admin/_shell 的 NavUser 模式)。
export const Route = createFileRoute('/frontend/_shell/about')({
  ssr: false,
  beforeLoad: ({ context }) => requireUser(context.queryClient),
  component: AboutPage,
  pendingComponent: AboutPending,
  staticData: {
    titleKey: 'titles.frontendAbout',
  },
})
