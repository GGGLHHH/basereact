import { createFileRoute } from '@tanstack/react-router'

import { userQueryOptions } from '@/api/users'
import { UserEditPage } from '@/business/user/user-edit-page'

// $userId_ 尾下划线:从详情去嵌套,编辑整屏替换详情。
export const Route = createFileRoute('/admin/_shell/users_/$userId_/edit')({
  component: UserEditRoute,
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(userQueryOptions(params.userId)),
  staticData: {
    titleKey: 'titles.adminUserEdit',
    accessPolicyKeys: ['updateUser'],
  },
})

function UserEditRoute() {
  const { userId } = Route.useParams()
  // key 绑 userId:同路由换用户(改 URL / 历史前进后退)时强制重挂载,
  // 让表单按新用户重新播种(useAppForm 只在挂载时取 defaultValues,不随 props 变)。
  return (
    <UserEditPage
      key={userId}
      userId={userId}
    />
  )
}
