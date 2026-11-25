import type { Service } from '@/generated/api-types'
import { ActivityIcon } from '@gedatou/cadenza-icons'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { MonitoringPage } from './-monitoring-page'

// 服务筛选的取值跟着生成的 Service 走(写错 / 后端改名就编译报错)
const SERVICE_FILTERS = ['all', 'app', 'idm', 'web'] as const satisfies readonly ('all' | Service)[]

// 标签页 / 时间范围 / 日志筛选都进 URL search:能分享、能后退,刷新不丢。非法值回默认(catch)。
const monitoringSearchSchema = z.object({
  tab: z.enum(['overview', 'logs']).catch('overview').default('overview'),
  range: z.enum(['1h', '24h', '7d', '30d', '90d', '1y']).catch('1h').default('1h'),
  level: z.enum(['all', 'ERROR']).catch('all').default('all'),
  service: z.enum(SERVICE_FILTERS).catch('all').default('all'),
  q: z.string().catch('').default(''),
  rid: z.string().catch('').default(''),
  span: z.enum(['1h', '24h', '7d', '15d']).catch('24h').default('24h'),
  from: z.string().optional().catch(undefined),
  to: z.string().optional().catch(undefined),
  page: z.number().int().min(1).catch(1).default(1),
  size: z.number().int().min(1).max(100).catch(20).default(20),
})

export const Route = createFileRoute('/admin/_shell/monitoring')({
  component: MonitoringPage,
  validateSearch: monitoringSearchSchema,
  staticData: {
    titleKey: 'titles.adminMonitoring',
    menuTitleKey: 'titles.adminMonitoring',
    icon: ActivityIcon,
    groupKey: 'menuGroups.admin',
    order: 4,
    // 页面数据就是这个操作,准入随它(users:admin):缺权限时菜单不出现、直连进壳内 403。
    accessPolicyKeys: ['getMonitoring'],
  },
})
