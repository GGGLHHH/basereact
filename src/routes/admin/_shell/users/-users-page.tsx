import type { AdminUserView, RoleView } from '@/generated/api-types'
import { ChevronDownIcon, PlusIcon } from '@gedatou/cadenza-icons'
import { Button, InfiniteSelectClear, InfiniteSelectClose, InfiniteSelectFooter, SearchField } from '@gedatou/cadenza-ui'
import { getRouteApi } from '@tanstack/react-router'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useUsers } from '@/api/users'

import { RoleInfiniteSelect } from '@/business/role/select/role-infinite-select'
import { DeleteUserDialog } from '@/business/user/delete-user-dialog'
import { canManageAccount, PLATFORM_ROLE_NAMES, ROLE_LABEL_KEYS } from '@/business/user/roles'
import { UserTable } from '@/business/user/table'
import { HostHoverIcon, PlayOnHover } from '@/components/icon-motion'
import { toDataPagination } from '@/components/table/pagination'
import { Separator } from '@/components/ui/separator'
import { useMyPermissions } from '@/lib/use-access-policy'
import { cn } from '@/lib/utils'

// 组件与路由定义分文件:路由文件只导出 Route(单一导出才吃得到代码分割 / fast refresh),
// 组件这边按 id 取路由 API,免回头 import Route 造成循环依赖。
const routeApi = getRouteApi('/admin/_shell/users/')

export function UsersPage() {
  const { page, size, q, role } = routeApi.useSearch()
  const navigate = routeApi.useNavigate()
  const { t } = useTranslation('common')
  // role 存角色名:直接喂后端 filter(RoleName),也是选择器候选的键。
  const { data, isPending } = useUsers({ page, size, q, role })
  // 角色筛选的候选 = 全部平台角色(账号列表的角色列就是平台角色),不用 /roles 目录 —— 那只列
  // 「调用者能授出的」,平台管理员拿到的是空目录,却仍要能按 superadmin / 平台管理员筛。
  const roleFilterOptions = useMemo<RoleView[]>(
    () => PLATFORM_ROLE_NAMES.map(name => ({ display_name: t(ROLE_LABEL_KEYS[name]), id: name, name })),
    [t],
  )
  // PageInfo(union)→ 分页器 total 走 ACL(见 table/pagination),免手搓 union 窄化。
  const { total } = toDataPagination(data?.page_info)

  const roleCount = role?.length ?? 0

  // 待删目标即弹窗开合信号;删除成功由列表失效自动刷新(DeleteUserDialog 内 invalidate)。
  const [deleteTarget, setDeleteTarget] = useState<AdminUserView | null>(null)
  // 持平台角色的账号(superadmin / 平台管理员)只有 platform:roles 能管:其余操作者看不到它们的编辑 / 删除。
  const permissions = useMyPermissions()
  const canManage = useCallback(
    (user: AdminUserView) => canManageAccount(user, permissions),
    [permissions],
  )

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
              void navigate({ resetScroll: false, search: prev => ({ ...prev, page: 1, q: next }) })
            }}
          />
          <RoleInfiniteSelect
            commitOnClose
            options={roleFilterOptions}
            selectionMode='multiple'
            value={role ?? []}
            // 候选的 id 就是角色名(固定闭集)→ 直接存名字。
            onValueChange={(items) => {
              const picked = items.map(r => r.name)
              void navigate({
                resetScroll: false,
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
              <HostHoverIcon
                className='size-4 shrink-0 opacity-50'
                icon={ChevronDownIcon}
              />
            </Button>
          </RoleInfiniteSelect>
        </div>
        <PlayOnHover>
          <Button
            onClick={() => {
              void navigate({ to: '/admin/users/new' })
            }}
          >
            <PlusIcon className='size-4' />
            {t('users.new')}
          </Button>
        </PlayOnHover>
      </div>
      <UserTable
        data={data?.items ?? []}
        isLoading={isPending}
        limit={size}
        page={page}
        total={total}
        canManage={canManage}
        onDelete={setDeleteTarget}
        onEdit={(user) => {
          void navigate({ params: { userId: user.id }, to: '/admin/users/$userId/edit' })
        }}
        onLimitChange={(limit) => {
          // 必须 spread prev:整体替换 search 会把搜索词与筛选条件一起抹掉
          // (下面的 onPageChange 一直是对的,这条一直不是)。
          void navigate({ resetScroll: false, search: prev => ({ ...prev, page: 1, size: limit }) })
        }}
        onPageChange={(nextPage) => {
          void navigate({ resetScroll: false, search: prev => ({ ...prev, page: nextPage }) })
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
