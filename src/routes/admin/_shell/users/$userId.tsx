import { createFileRoute } from '@tanstack/react-router'

import { userQueryOptions } from '@/api/users'
import { UserDetailPage } from '@/business/user/user-detail-page'

// 详情页,/admin/users/$userId(挂在 users 布局之下)。edit 用尾下划线段
// 从本路由去嵌套 → 编辑整屏替换详情而非套进来,故本路由是叶子(无 Outlet)。
export const Route = createFileRoute('/admin/_shell/users/$userId')({
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
