import { createFileRoute } from '@tanstack/react-router'

import { UserCreatePage } from '@/business/user/user-create-page'

// 建号页,/admin/users 之下的子路由(整屏渲染进父 Outlet)。
export const Route = createFileRoute('/admin/_shell/users/new')({
  component: UserCreatePage,
  staticData: {
    titleKey: 'titles.adminUserCreate',
    // 准入随写权限:缺 createUser(= users:admin)直连本页守卫转壳内 403。
    accessPolicyKeys: ['createUser'],
  },
})
