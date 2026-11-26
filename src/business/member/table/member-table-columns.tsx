import type { DataTableColumn } from '@gedatou/cadenza-ui'
import type { TFunction } from 'i18next'
import type { MemberView } from '@/generated/api-types'
import { ShieldCheckIcon, Trash2Icon } from '@gedatou/cadenza-icons'
import { Avatar, AvatarFallback, AvatarImage, Button } from '@gedatou/cadenza-ui'

import { dash } from '@/business/common'
import { PlayOnHover } from '@/components/icon-motion'
import { stopRowActivation } from '@/components/table/stop-row-activation'
import { nameInitials } from '@/lib/display-name'

import { MemberRoleBadges, MemberStatusBadge } from '../member-badges'

export type MemberColumnDef = DataTableColumn<MemberView>

export interface MemberRowActions {
  onEditRoles?: (member: MemberView) => void
  onRemove?: (member: MemberView) => void
  /**
   * 这一行能不能改角色 / 移出(缺省 = 能)。持平台角色的成员(superadmin / 平台管理员)只有 platform:roles
   * 能动 —— 不能动的行不出操作按钮,后端兜底 403。
   */
  canManage?: (member: MemberView) => boolean
}

// currentUserId:自己那一行不给改角色 / 移除(后端也会 409 兜底:不能移出自己、改自己不能丢成员管理权)。
function actionsColumn(t: TFunction<'common'>, actions: MemberRowActions, currentUserId?: string): MemberColumnDef {
  return {
    id: 'actions',
    header: t('members.actions'),
    width: 96,
    pinned: 'end',
    hideable: false,
    cell: member => member.id === currentUserId || !(actions.canManage?.(member) ?? true)
      ? null
      : (
          <div className='flex items-center gap-0.5'>
            {actions.onEditRoles
              ? (
                  <PlayOnHover>
                    <Button
                      aria-label={t('members.editRoles.action')}
                      onKeyDown={stopRowActivation}
                      onClick={(event) => {
                        event.stopPropagation()
                        actions.onEditRoles?.(member)
                      }}
                      size='icon-sm'
                      variant='ghost'
                    >
                      <ShieldCheckIcon className='size-4' />
                    </Button>
                  </PlayOnHover>
                )
              : null}
            {actions.onRemove
              ? (
                  <PlayOnHover>
                    <Button
                      aria-label={t('members.remove.action')}
                      className='text-destructive hover:text-destructive'
                      onKeyDown={stopRowActivation}
                      onClick={(event) => {
                        event.stopPropagation()
                        actions.onRemove?.(member)
                      }}
                      size='icon-sm'
                      variant='ghost'
                    >
                      <Trash2Icon className='size-4' />
                    </Button>
                  </PlayOnHover>
                )
              : null}
          </div>
        ),
  }
}

// 身份列(头像 + 用户名 + 邮箱)沿用账号表的词汇;角色是本租户里的租户角色。
export function createMemberColumns(
  t: TFunction<'common'>,
  actions?: MemberRowActions,
  currentUserId?: string,
): MemberColumnDef[] {
  const columns: MemberColumnDef[] = [
    {
      id: 'username',
      header: t('members.columns.username'),
      rowHeader: true,
      hideable: false,
      cell: m => (
        <div className='flex items-center gap-3'>
          <Avatar>
            <AvatarImage
              alt={m.display_name ?? m.username}
              src={m.avatar_url ?? undefined}
            />
            <AvatarFallback>{nameInitials((m.display_name ?? '') || m.username)}</AvatarFallback>
          </Avatar>
          <div className='flex min-w-0 flex-col'>
            <span className='truncate font-medium'>{m.username}</span>
            <span className='truncate text-xs text-muted-foreground'>{dash(m.email)}</span>
          </div>
        </div>
      ),
    },
    {
      id: 'display_name',
      header: t('members.columns.displayName'),
      cell: m => dash(m.display_name),
    },
    {
      id: 'roles',
      header: t('members.columns.roles'),
      width: 200,
      cell: m => (
        <MemberRoleBadges
          className='flex-nowrap'
          roles={m.roles}
        />
      ),
    },
    {
      id: 'status',
      header: t('members.columns.status'),
      width: 110,
      cell: m => <MemberStatusBadge status={m.status} />,
    },
  ]

  if (actions && (actions.onEditRoles || actions.onRemove)) {
    columns.push(actionsColumn(t, actions, currentUserId))
  }
  return columns
}
