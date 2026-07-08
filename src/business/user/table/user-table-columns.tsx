import { createColumnHelper } from '@tanstack/react-table'

import type { TFunction } from 'i18next'
import type { ColumnDef } from '@tanstack/react-table'
import type { AdminUserView } from '#/generated/api-types'

import { dash } from '@/business/common'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/datetime'
import { nameInitials } from '@/lib/display-name'

import { RoleBadges, VerifiedBadge } from '../user-badges'

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

// 身份优先的用户列表:头像+用户名+邮箱合成一列,角色/验证走凭证词汇的 chips/印章。
// (原来一列一字段的 id/avatar_url/email_verified 原样铺陈太密,收敛进身份列 + 徽章。)
export function createUserColumns(
  t: TFunction<'common'>,
  actions?: UserRowActions,
): UserColumnDef[] {
  const columns: UserColumnDef[] = [
    columnHelper.accessor('username', {
      header: t('users.columns.username'),
      cell: ({ row }) => {
        const u = row.original
        return (
          <div className='flex items-center gap-3'>
            <Avatar>
              <AvatarImage
                alt={u.display_name ?? u.username}
                src={u.avatar_url ?? undefined}
              />
              <AvatarFallback>{nameInitials(u.display_name || u.username)}</AvatarFallback>
            </Avatar>
            <div className='flex min-w-0 flex-col'>
              <span className='truncate font-medium'>{u.username}</span>
              <span className='truncate text-xs text-muted-foreground'>{dash(u.email)}</span>
            </div>
          </div>
        )
      },
    }),
    columnHelper.accessor('display_name', {
      header: t('users.columns.displayName'),
      cell: ({ getValue }) => dash(getValue()),
    }),
    columnHelper.accessor('roles', {
      header: t('users.columns.roles'),
      size: 180,
      cell: ({ getValue }) => (
        <RoleBadges
          className='flex-nowrap'
          max={2}
          roles={getValue()}
        />
      ),
    }),
    columnHelper.accessor('email_verified', {
      header: t('users.columns.emailVerified'),
      cell: ({ getValue }) => <VerifiedBadge verified={getValue()} />,
    }),
    columnHelper.accessor('created_at', {
      header: t('users.columns.createdAt'),
      cell: ({ getValue }) => (
        <span className='text-sm text-muted-foreground'>{formatDateTime(getValue())}</span>
      ),
    }),
  ]

  const hasActions = Boolean(actions && (actions.onView || actions.onEdit || actions.onDelete))
  if (hasActions) {
    columns.push(actionsColumn(t, actions!))
  }

  return columns
}
