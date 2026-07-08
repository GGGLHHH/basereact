import { createFileRoute } from '@tanstack/react-router'

import { UserCreatePage } from '@/business/user/user-create-page'

// users_ 尾下划线:从列表 users.tsx 去嵌套,建号页整屏替换而非套在表格下。
export const Route = createFileRoute('/admin/_shell/users_/new')({
  component: UserCreatePage,
  staticData: {
    titleKey: 'titles.adminUserCreate',
    // 准入随写权限:缺 createUser(= users:admin)直连本页守卫转壳内 403。
    accessPolicyKeys: ['createUser'],
  },
})
