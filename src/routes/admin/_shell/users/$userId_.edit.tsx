import { createFileRoute } from '@tanstack/react-router'

import { userQueryOptions } from '@/api/users'

import { UserEditRoute } from './-user-edit-route'

// $userId_ 尾下划线:从详情去嵌套,编辑整屏替换详情(仍在 users 布局之下)。
export const Route = createFileRoute('/admin/_shell/users/$userId_/edit')({
  component: UserEditRoute,
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(userQueryOptions(params.userId)),
  staticData: {
    titleKey: 'titles.adminUserEdit',
    accessPolicyKeys: ['updateUser'],
  },
})
