import { createFileRoute } from '@tanstack/react-router'

import { z } from 'zod'

import { AuthLogPage } from './-auth-log-page'

const TABLE_SIZE = 20

// page/size 进 URL search(同 users 路由)。非法回默认(catch),缺失走 default(菜单跳本页
// 可省 search);size 上限对齐分页器选项 [10..100]。
const authLogSearchSchema = z.object({
  page: z.number().int().min(1).catch(1).default(1),
  size: z.number().int().min(1).max(100).catch(TABLE_SIZE).default(TABLE_SIZE),
})

export const Route = createFileRoute('/admin/_shell/auth-log')({
  component: AuthLogPage,
  validateSearch: authLogSearchSchema,
  staticData: {
    titleKey: 'titles.adminAuthLog',
    menuTitleKey: 'titles.adminAuthLog',
    icon: 'i-tabler-shield-lock',
    groupKey: 'menuGroups.admin',
    order: 3,
    // 安全审计页,准入随 users:admin(与后端 auth-events 端点一致);无元数据会 fail-closed。
    accessPolicyKeys: ['listAuthEvents'],
  },
})
