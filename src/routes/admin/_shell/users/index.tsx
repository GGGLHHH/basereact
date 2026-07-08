import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import type { AdminUserView } from '#/generated/api-types'

import { useUsers } from '@/api/users'
import { DeleteUserDialog } from '@/business/user/delete-user-dialog'
import { UserTable } from '@/business/user/table'
import { Button } from '@/components/ui/button'
import { toDataPagination } from '@/components/table/pagination'

// 非法一律回默认值(catch),不抛错误页;缺失走 default(让跨路由 navigate 到本页
// 时 search 可省)。size 上限对齐后端 clamp [1,100]。
const usersSearchSchema = z.object({
  page: z.number().int().min(1).catch(1).default(1),
  size: z.number().int().min(1).max(100).catch(20).default(20),
})

// /admin/users 落地内容(父 route.tsx 的 Outlet 里)。菜单/面包屑标题挂在父
// route.tsx,本 index 不设 titleKey,避免同路径重复出现。分页 search 只在此声明,
// 建号/详情/编辑不继承(它们不需要 page/size)。
export const Route = createFileRoute('/admin/_shell/users/')({
  component: UsersPage,
  validateSearch: usersSearchSchema,
})

function UsersPage() {
  const { page, size } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { t } = useTranslation('common')
  const { data, isPending } = useUsers({ page, size })
  // PageInfo(union)→ 分页器 total 走 ACL(见 table/pagination),免手搓 union 窄化。
  const { total } = toDataPagination(data?.page_info)

  // 待删目标即弹窗开合信号;删除成功由列表失效自动刷新(DeleteUserDialog 内 invalidate)。
  const [deleteTarget, setDeleteTarget] = useState<AdminUserView | null>(null)

  const goDetail = (user: AdminUserView) =>
    void navigate({ params: { userId: user.id }, to: '/admin/users/$userId' })

  return (
    <>
      <div className='flex justify-end'>
        <Button
          onClick={() => {
            void navigate({ to: '/admin/users/new' })
          }}
        >
          <span className='i-lucide-plus size-4' />
          {t('users.new')}
        </Button>
      </div>
      <UserTable
        data={data?.items ?? []}
        isLoading={isPending}
        limit={size}
        page={page}
        total={total}
        onDelete={setDeleteTarget}
        onEdit={(user) => {
          void navigate({ params: { userId: user.id }, to: '/admin/users/$userId/edit' })
        }}
        onLimitChange={(limit) => {
          void navigate({ search: { page: 1, size: limit } })
        }}
        onPageChange={(nextPage) => {
          void navigate({ search: (prev) => ({ ...prev, page: nextPage }) })
        }}
        onRowClick={goDetail}
        onView={goDetail}
      />
      <DeleteUserDialog
        open={deleteTarget !== null}
        user={deleteTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null)
          }
        }}
      />
    </>
  )
}
