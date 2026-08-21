import { getRouteApi } from '@tanstack/react-router'

import { UserDetailPage } from '@/business/user/user-detail-page'

// 组件不在路由文件里,用 getRouteApi 按 id 取同一套类型安全 hooks(免与 ./$userId 互相 import)。
const route = getRouteApi('/admin/_shell/users/$userId')

export function UserDetailRoute() {
  const { userId } = route.useParams()
  return <UserDetailPage userId={userId} />
}
