import { getRouteApi } from '@tanstack/react-router'

import { UserEditPage } from '@/business/user/user-edit-page'

// 组件不在路由文件里,用 getRouteApi 按 id 取同一套类型安全 hooks(免与 ./$userId_.edit 互相 import)。
const route = getRouteApi('/admin/_shell/users/$userId_/edit')

export function UserEditRoute() {
  const { userId } = route.useParams()
  // key 绑 userId:同路由换用户(改 URL / 历史前进后退)时强制重挂载,
  // 让表单按新用户重新播种(useAppForm 只在挂载时取 defaultValues,不随 props 变)。
  return (
    <UserEditPage
      key={userId}
      userId={userId}
    />
  )
}
