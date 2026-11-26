import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { z } from 'zod'

import { TenantsPage } from './-tenants-page'

const SEARCH_DEFAULTS = { page: 1, size: 20 }

// 非法一律回默认值(catch),缺失走 default;size 上限对齐后端 clamp [1,100]。
const tenantsSearchSchema = z.object({
  page: z.number().int().min(1).catch(SEARCH_DEFAULTS.page).default(SEARCH_DEFAULTS.page),
  size: z.number().int().min(1).max(100).catch(SEARCH_DEFAULTS.size).default(SEARCH_DEFAULTS.size),
})

// /admin/tenants 落地内容。标题挂在父 route.tsx,本 index 不设 titleKey(免面包屑重复)。
export const Route = createFileRoute('/admin/_shell/tenants/')({
  component: TenantsPage,
  search: {
    middlewares: [stripSearchParams(SEARCH_DEFAULTS)],
  },
  validateSearch: tenantsSearchSchema,
})
