import { createFileRoute } from '@tanstack/react-router'

import { profileQueryOptions } from '@/api/profile'

import { ProfilePage } from './-profile-page'

export const Route = createFileRoute('/admin/_shell/profile')({
  component: ProfilePage,
  // 进页前把 profile.me 填满:侧边栏 NavUser 可能已取过(同缓存),命中则零请求。
  loader: ({ context }) => context.queryClient.ensureQueryData(profileQueryOptions),
  staticData: {
    titleKey: 'profile',
    // 个人页只进面包屑,不进主导航(个人设置类)。
    hideInMenu: true,
  },
})
