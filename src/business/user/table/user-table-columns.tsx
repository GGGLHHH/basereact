import type { DataTableColumn } from '@gedatou/cadenza-ui'
import type { TFunction } from 'i18next'

import type { AdminUserView } from '#/generated/api-types'
import { Button } from '@gedatou/cadenza-ui'
import { dash } from '@/business/common'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatDateTime } from '@/lib/datetime'
import { nameInitials } from '@/lib/display-name'

import { RoleBadges, VerifiedBadge } from '../user-badges'

export type UserColumnDef = DataTableColumn<AdminUserView>

export interface UserRowActions {
  onView?: (user: AdminUserView) => void
  onEdit?: (user: AdminUserView) => void
  onDelete?: (user: AdminUserView) => void
}

// 每个操作按钮都要 stopPropagation:整行点击已绑详情跳转(见 user-table.tsx 的
// onRowAction),不拦截的话点删除会连带触发导航。
//
// pinned: 'end' 取代了原先在 DataTable 上传的 pinnedColumns={{right:['actions']}} ——
// cadenza 把「钉哪一列」放回列自己身上。钉列必须有数字 width,偏移量由它算出来。
// hideable: false —— 操作列不该被列显隐控件藏掉。
function actionsColumn(t: TFunction<'common'>, actions: UserRowActions): UserColumnDef {
  return {
    id: 'actions',
    header: t('users.actions'),
    width: 132,
    pinned: 'end',
    hideable: false,
    cell: user => (
      <div className='flex items-center gap-0.5'>
        {actions.onView
          ? (
              <Button
                aria-label={t('action.view')}
                onClick={(event) => {
                  event.stopPropagation()
                  actions.onView?.(user)
                }}
                size='icon-sm'
                variant='ghost'
              >
                <span className='i-lucide-eye size-4' />
              </Button>
            )
          : null}
        {actions.onEdit
          ? (
              <Button
                aria-label={t('action.edit')}
                onClick={(event) => {
                  event.stopPropagation()
                  actions.onEdit?.(user)
                }}
                size='icon-sm'
                variant='ghost'
              >
                <span className='i-lucide-pencil size-4' />
              </Button>
            )
          : null}
        {actions.onDelete
          ? (
              <Button
                aria-label={t('action.delete')}
                className='text-destructive hover:text-destructive'
                onClick={(event) => {
                  event.stopPropagation()
                  actions.onDelete?.(user)
                }}
                size='icon-sm'
                variant='ghost'
              >
                <span className='i-lucide-trash-2 size-4' />
              </Button>
            )
          : null}
      </div>
    ),
  }
}

// 身份优先的用户列表:头像+用户名+邮箱合成一列,角色/验证走凭证词汇的 chips/印章。
// (原来一列一字段的 id/avatar_url/email_verified 原样铺陈太密,收敛进身份列 + 徽章。)
export function createUserColumns(
  t: TFunction<'common'>,
  actions?: UserRowActions,
): UserColumnDef[] {
  const columns: UserColumnDef[] = [
    {
      // rowHeader:这一列给读屏当行的名字。不写的话 cadenza 默认取第一列,
      // 结果一样,但写出来才是声明而非巧合。
      id: 'username',
      header: t('users.columns.username'),
      rowHeader: true,
      hideable: false,
      cell: u => (
        <div className='flex items-center gap-3'>
          <Avatar>
            <AvatarImage
              alt={u.display_name ?? u.username}
              src={u.avatar_url ?? undefined}
            />
            <AvatarFallback>{nameInitials((u.display_name ?? '') || u.username)}</AvatarFallback>
          </Avatar>
          <div className='flex min-w-0 flex-col'>
            <span className='truncate font-medium'>{u.username}</span>
            <span className='truncate text-xs text-muted-foreground'>{dash(u.email)}</span>
          </div>
        </div>
      ),
    },
    {
      id: 'display_name',
      header: t('users.columns.displayName'),
      cell: u => dash(u.display_name),
    },
    {
      id: 'roles',
      header: t('users.columns.roles'),
      width: 180,
      cell: u => (
        <RoleBadges
          className='flex-nowrap'
          max={2}
          roles={u.roles}
        />
      ),
    },
    {
      id: 'email_verified',
      header: t('users.columns.emailVerified'),
      cell: u => <VerifiedBadge verified={u.email_verified} />,
    },
    {
      id: 'created_at',
      header: t('users.columns.createdAt'),
      cell: u => (
        <span className='text-sm text-muted-foreground'>{formatDateTime(u.created_at)}</span>
      ),
    },
  ]

  const hasActions = Boolean(actions && (actions.onView || actions.onEdit || actions.onDelete))
  if (hasActions) {
    columns.push(actionsColumn(t, actions!))
  }

  return columns
}
