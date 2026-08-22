import type { AdminUserView } from '#/generated/api-types'
import { Button, InfiniteSelectClear, InfiniteSelectClose, InfiniteSelectFooter, SearchField } from '@gedatou/cadenza-ui'
import { getRouteApi } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useUsers } from '@/api/users'
import { RoleInfiniteSelect } from '@/business/role/select/role-infinite-select'
import { DeleteUserDialog } from '@/business/user/delete-user-dialog'
import { UserTable } from '@/business/user/table'
import { toDataPagination } from '@/components/table/pagination'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

// 组件与路由定义分文件:路由文件只导出 Route(单一导出才吃得到代码分割 / fast refresh),
// 组件这边按 id 取路由 API,免回头 import Route 造成循环依赖。
const routeApi = getRouteApi('/admin/_shell/users/')

export function UsersPage() {
  const { page, size, q, role } = routeApi.useSearch()
  const navigate = routeApi.useNavigate()
  const { t } = useTranslation('common')
  // role 存 {id,name}:name 喂后端 filter(RoleName),id 喂选择器(uuid)—— 无目录、无映射。
  const { data, isPending } = useUsers({ page, size, q, role: role?.map(r => r.name) })
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
          <SearchField
            className='max-w-xs'
            placeholder={t('users.searchPlaceholder')}
            defaultValue={q}
            // q 变即回第 1 页;SearchField 已归一化(trim 后空串 → undefined)。
            onQueryValueChange={(next) => {
              void navigate({ search: prev => ({ ...prev, page: 1, q: next }) })
            }}
          />
          <RoleInfiniteSelect
            commitOnClose
            selectionMode='multiple'
            value={role?.map(r => r.id) ?? []}
            // items 自带 id+name(角色是全量加载的封闭集,items 恒完整)→ 直接存对象,无目录映射。
            onValueChange={(items) => {
              const picked = items.map(r => ({ id: r.id, name: r.name }))
              void navigate({
                search: prev => ({
                  ...prev,
                  page: 1,
                  role: picked.length > 0 ? picked : undefined,
                }),
              })
            }}
            slots={(
              <InfiniteSelectFooter>
                <InfiniteSelectClear>{t('action.clear')}</InfiniteSelectClear>
                <Separator orientation='vertical' />
                <InfiniteSelectClose>{t('action.confirm')}</InfiniteSelectClose>
              </InfiniteSelectFooter>
            )}
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
          // 必须 spread prev:整体替换 search 会把搜索词与筛选条件一起抹掉
          // (下面的 onPageChange 一直是对的,这条一直不是)。
          void navigate({ search: prev => ({ ...prev, page: 1, size: limit }) })
        }}
        onPageChange={(nextPage) => {
          void navigate({ search: prev => ({ ...prev, page: nextPage }) })
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
