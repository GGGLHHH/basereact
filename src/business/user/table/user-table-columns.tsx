import { createColumnHelper } from '@tanstack/react-table'

import type { TFunction } from 'i18next'
import type { ColumnDef } from '@tanstack/react-table'
import type { AdminUserView } from '#/generated/api-types'

import { dash } from '@/business/common'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/datetime'

const columnHelper = createColumnHelper<AdminUserView>()

export type UserColumnDef = ColumnDef<AdminUserView, any>

export interface UserRowActions {
  onView?: (user: AdminUserView) => void
  onEdit?: (user: AdminUserView) => void
  onDelete?: (user: AdminUserView) => void
}

// 每个操作按钮都要 stopPropagation:整行点击已绑详情跳转(见 user-table.tsx 的
// onRowClick),不拦截的话点删除会连带触发导航。
function actionsColumn(t: TFunction<'common'>, actions: UserRowActions): UserColumnDef {
  return columnHelper.display({
    id: 'actions',
    header: t('users.actions'),
    size: 132,
    cell: ({ row }) => (
      <div className='flex items-center gap-0.5'>
        {actions.onView ? (
          <Button
            aria-label={t('action.view')}
            onClick={(event) => {
              event.stopPropagation()
              actions.onView?.(row.original)
            }}
            size='icon-sm'
            variant='ghost'
          >
            <span className='i-lucide-eye size-4' />
          </Button>
        ) : null}
        {actions.onEdit ? (
          <Button
            aria-label={t('action.edit')}
            onClick={(event) => {
              event.stopPropagation()
              actions.onEdit?.(row.original)
            }}
            size='icon-sm'
            variant='ghost'
          >
            <span className='i-lucide-pencil size-4' />
          </Button>
        ) : null}
        {actions.onDelete ? (
          <Button
            aria-label={t('action.delete')}
            className='text-destructive hover:text-destructive'
            onClick={(event) => {
              event.stopPropagation()
              actions.onDelete?.(row.original)
            }}
            size='icon-sm'
            variant='ghost'
          >
            <span className='i-lucide-trash-2 size-4' />
          </Button>
        ) : null}
      </div>
    ),
  })
}

// 原样展示 AdminUserView 全字段;传入 actions(任一 handler)时追加固定操作列。
export function createUserColumns(
  t: TFunction<'common'>,
  actions?: UserRowActions,
): UserColumnDef[] {
  const columns: UserColumnDef[] = [
    columnHelper.accessor('id', { header: t('users.columns.id') }),
    columnHelper.accessor('username', { header: t('users.columns.username') }),
    columnHelper.accessor('email', {
      header: t('users.columns.email'),
      cell: ({ getValue }) => dash(getValue()),
    }),
    columnHelper.accessor('display_name', {
      header: t('users.columns.displayName'),
      cell: ({ getValue }) => dash(getValue()),
    }),
    columnHelper.accessor('avatar_url', {
      header: t('users.columns.avatarUrl'),
      cell: ({ getValue }) => dash(getValue()),
    }),
    columnHelper.accessor('email_verified', {
      header: t('users.columns.emailVerified'),
      cell: ({ getValue }) => String(getValue()),
    }),
    columnHelper.accessor('roles', {
      header: t('users.columns.roles'),
      cell: ({ getValue }) => getValue().join(', ') || '—',
    }),
    columnHelper.accessor('created_at', {
      header: t('users.columns.createdAt'),
      cell: ({ getValue }) => formatDateTime(getValue()),
    }),
  ]

  const hasActions = Boolean(actions && (actions.onView || actions.onEdit || actions.onDelete))
  if (hasActions) {
    columns.push(actionsColumn(t, actions!))
  }

  return columns
}
