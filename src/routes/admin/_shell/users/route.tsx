import { createFileRoute } from '@tanstack/react-router'

// 用户区一级父路由:/admin/users。route.tsx = 纯布局(无 component → 默认渲染
// <Outlet/>,子路由整屏承载,不加任何 chrome,视觉与拆分前一致)。菜单标题、图标、
// 分组、准入声明都挂这里:菜单节点即本路由,列表/建号/详情/编辑作为子路由挂在
// /admin/users 之下,面包屑因此带上可点的 "Users" 父级。
// accessPolicyKeys 落在父层 → 子路由匹配链都 AND 上 listUsers;user 区四个操作
// (listUsers/getUser/createUser/updateUser)权限集全同(users:admin + admin:login),
// 故此 AND 为恒等,不改任何页面的实际准入。
export const Route = createFileRoute('/admin/_shell/users')({
  staticData: {
    titleKey: 'titles.adminUsers',
    menuTitleKey: 'titles.adminUsers',
    icon: 'i-tabler-users',
    groupKey: 'menuGroups.admin',
    accessPolicyKeys: ['listUsers'],
  },
})
