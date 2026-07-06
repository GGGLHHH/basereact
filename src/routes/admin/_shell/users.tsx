import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { useUsers } from '@/api/users'
import { UserTable } from '@/business/user/table'
import { toDataPagination } from '@/components/table/pagination'

// 非法/缺失一律回默认值(catch),不抛错误页;size 上限对齐后端 clamp [1,100]。
const usersSearchSchema = z.object({
  page: z.number().int().min(1).catch(1),
  size: z.number().int().min(1).max(100).catch(20),
})

export const Route = createFileRoute('/admin/_shell/users')({
  component: UsersPage,
  validateSearch: usersSearchSchema,
  staticData: {
    titleKey: 'titles.adminUsers',
    menuTitleKey: 'titles.adminUsers',
    icon: 'i-tabler-users',
    groupKey: 'menuGroups.admin',
    // 页面主数据即列表操作,准入随它:缺 users:admin 时菜单不出现、直连进壳内 403。
    accessPolicyKeys: ['listUsers'],
  },
})

function UsersPage() {
  const { page, size } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data, isPending } = useUsers({ page, size })
  // PageInfo(union)→ 分页器 total 走 ACL(见 table/pagination),免手搓 union 窄化。
  const { total } = toDataPagination(data?.page_info)

  return (
    <UserTable
      data={data?.items ?? []}
      isLoading={isPending}
      limit={size}
      page={page}
      total={total}
      onLimitChange={(limit) => {
        void navigate({ search: { page: 1, size: limit } })
      }}
      onPageChange={(nextPage) => {
        void navigate({ search: (prev) => ({ ...prev, page: nextPage }) })
      }}
    />
  )
}
