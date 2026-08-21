import { createFileRoute, stripSearchParams } from '@tanstack/react-router'

import { z } from 'zod'

import { UsersPage } from './-users-page'

// 默认值单一来源:schema 的 default 与 stripSearchParams 共用,避免两处漂移
// (否则 strip 的默认对不上 schema,URL 里默认参数就清不掉)。
const SEARCH_DEFAULTS = { page: 1, size: 20 }

// 非法一律回默认值(catch),不抛错误页;缺失走 default(让跨路由 navigate 到本页
// 时 search 可省)。size 上限对齐后端 clamp [1,100]。q = 用户名 + 显示名模糊搜索
// (投影后端;未配 search 后端时后端会 422)。
const usersSearchSchema = z.object({
  page: z.number().int().min(1).catch(SEARCH_DEFAULTS.page).default(SEARCH_DEFAULTS.page),
  size: z.number().int().min(1).max(100).catch(SEARCH_DEFAULTS.size).default(SEARCH_DEFAULTS.size),
  q: z.string().trim().min(1).optional().catch(undefined),
  // role 过滤存 {id,name} 对象(search params 支持嵌套 JSON):id 直接喂 RoleInfiniteSelect
  // (uuid 键),name 直接喂后端 filter(RoleName)—— URL 自带两者,免掉目录拉取 + 名↔uuid 映射。
  role: z
    .array(z.object({ id: z.string(), name: z.enum(['superadmin', 'admin', 'user']) }))
    .optional()
    .catch(undefined),
})

// /admin/users 落地内容(父 route.tsx 的 Outlet 里)。菜单/面包屑标题挂在父
// route.tsx,本 index 不设 titleKey,避免同路径重复出现。分页 search 只在此声明,
// 建号/详情/编辑不继承(它们不需要 page/size)。
export const Route = createFileRoute('/admin/_shell/users/')({
  component: UsersPage,
  search: {
    // 等于默认值的 page/size 从 URL 剥掉,地址栏不显示冗余默认参数。
    middlewares: [stripSearchParams(SEARCH_DEFAULTS)],
  },
  validateSearch: usersSearchSchema,
})
