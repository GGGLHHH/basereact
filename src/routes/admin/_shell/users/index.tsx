import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import type { AdminUserView, RoleName } from '#/generated/api-types'

import { useUsers } from '@/api/users'
import { RoleInfiniteSelect } from '@/business/role/select/role-infinite-select'
import { DeleteUserDialog } from '@/business/user/delete-user-dialog'
import { UserTable } from '@/business/user/table'
import { SearchInput } from '@/components/search-input'
import {
  InfiniteSelectClearButton,
  InfiniteSelectConfirmButton,
  InfiniteSelectFooter,
} from '@/components/select/infinite-select'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { toDataPagination } from '@/components/table/pagination'
import { cn } from '@/lib/utils'

// 默认值单一来源:schema 的 default 与 stripSearchParams 共用,避免两处漂移
//(否则 strip 的默认对不上 schema,URL 里默认参数就清不掉)。
const SEARCH_DEFAULTS = { page: 1, size: 20 }

// 非法一律回默认值(catch),不抛错误页;缺失走 default(让跨路由 navigate 到本页
// 时 search 可省)。size 上限对齐后端 clamp [1,100]。q = 用户名 + 显示名模糊搜索
//(投影后端;未配 search 后端时后端会 422)。
const usersSearchSchema = z.object({
  page: z.number().int().min(1).catch(SEARCH_DEFAULTS.page).default(SEARCH_DEFAULTS.page),
  size: z.number().int().min(1).max(100).catch(SEARCH_DEFAULTS.size).default(SEARCH_DEFAULTS.size),
  q: z.string().trim().min(1).optional().catch(undefined),
  // role 过滤存 {id,name} 对象(search params 支持嵌套 JSON):id 直接喂 RoleInfiniteSelect
  //(uuid 键),name 直接喂后端 filter(RoleName)—— URL 自带两者,免掉目录拉取 + 名↔uuid 映射。
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

function UsersPage() {
  const { page, size, q, role } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { t } = useTranslation('common')
  // role 存 {id,name}:name 喂后端 filter(RoleName),id 喂选择器(uuid)—— 无目录、无映射。
  const { data, isPending } = useUsers({ page, size, q, role: role?.map((r) => r.name) })
  // PageInfo(union)→ 分页器 total 走 ACL(见 table/pagination),免手搓 union 窄化。
  const { total } = toDataPagination(data?.page_info)

  const roleCount = role?.length ?? 0

  // 待删目标即弹窗开合信号;删除成功由列表失效自动刷新(DeleteUserDialog 内 invalidate)。
  const [deleteTarget, setDeleteTarget] = useState<AdminUserView | null>(null)

  const goDetail = (user: AdminUserView) =>
    void navigate({ params: { userId: user.id }, to: '/admin/users/$userId' })

  return (
    <>
      <div className='flex items-center justify-between gap-2'>
        <div className='flex items-center gap-2'>
          <SearchInput
            className='max-w-xs'
            placeholder={t('users.searchPlaceholder')}
            defaultValue={q}
            // q 变即回第 1 页;SearchInput 已归一化(空串 → undefined)。
            onSearch={(next) => {
              void navigate({ search: (prev) => ({ ...prev, page: 1, q: next }) })
            }}
          />
          <RoleInfiniteSelect
            commitOnClose
            multiple
            value={role?.map((r) => r.id) ?? []}
            // items 自带 id+name(角色是全量加载的封闭集,items 恒完整)→ 直接存对象,无目录映射。
            onChange={(items) => {
              const picked = items.map((r) => ({ id: r.id, name: r.name as RoleName }))
              void navigate({
                search: (prev) => ({
                  ...prev,
                  page: 1,
                  role: picked.length > 0 ? picked : undefined,
                }),
              })
            }}
            slots={
              <InfiniteSelectFooter>
                <InfiniteSelectClearButton>{t('action.clear')}</InfiniteSelectClearButton>
                <Separator orientation='vertical' />
                <InfiniteSelectConfirmButton>{t('action.confirm')}</InfiniteSelectConfirmButton>
              </InfiniteSelectFooter>
            }
          >
            <Button
              className='justify-between gap-2'
              type='button'
              variant='outline'
            >
              <span className={cn('truncate', roleCount === 0 && 'text-muted-foreground')}>
                {roleCount === 0
                  ? t('users.filterRoles')
                  : `${t('users.filterRoles')} (${roleCount})`}
              </span>
              <span className='i-lucide-chevron-down size-4 shrink-0 opacity-50' />
            </Button>
          </RoleInfiniteSelect>
        </div>
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
