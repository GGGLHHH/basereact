import { UsersRoundIcon } from '@gedatou/cadenza-icons'
import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { z } from 'zod'

import { MembersPage } from './-members-page'

const SEARCH_DEFAULTS = { page: 1, size: 20 }

// 非法一律回默认值(catch),缺失走 default;size 上限对齐后端 clamp [1,100]。
// q = 用户名 + 显示名模糊搜索(走 search 投影;未接 search 后端时后端 422)。
const membersSearchSchema = z.object({
  page: z.number().int().min(1).catch(SEARCH_DEFAULTS.page).default(SEARCH_DEFAULTS.page),
  size: z.number().int().min(1).max(100).catch(SEARCH_DEFAULTS.size).default(SEARCH_DEFAULTS.size),
  q: z.string().trim().min(1).optional().catch(undefined),
})

// 本租户「成员」页(取代原来的后台「用户」页,spec §4.5)。单页、无子路由,所以是叶子而不是
// section:菜单标题、准入、search 校验都挂在这一个路由上。准入 = listMembers(租户级
// members:read + 后台准入);平台上下文(没有当前租户)没有 members:read,菜单自然隐藏。
// 写操作(加人 / 改角色 / 移除)要 members:admin,页面里按钮级判断。
export const Route = createFileRoute('/admin/_shell/members')({
  component: MembersPage,
  search: {
    middlewares: [stripSearchParams(SEARCH_DEFAULTS)],
  },
  validateSearch: membersSearchSchema,
  staticData: {
    titleKey: 'titles.adminMembers',
    menuTitleKey: 'titles.adminMembers',
    icon: UsersRoundIcon,
    groupKey: 'menuGroups.admin',
    accessPolicyKeys: ['listMembers'],
  },
})
