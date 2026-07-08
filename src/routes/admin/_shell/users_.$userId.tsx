import { createFileRoute } from '@tanstack/react-router'

import { userQueryOptions } from '@/api/users'
import { UserDetailPage } from '@/business/user/user-detail-page'

export const Route = createFileRoute('/admin/_shell/users_/$userId')({
  component: UserDetailRoute,
  // 进页前 ensure 详情:命中缓存(列表刚看过)则零请求,首帧即有数据。
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(userQueryOptions(params.userId)),
  staticData: {
    titleKey: 'titles.adminUserDetail',
    accessPolicyKeys: ['getUser'],
  },
})

function UserDetailRoute() {
  const { userId } = Route.useParams()
  return <UserDetailPage userId={userId} />
}
