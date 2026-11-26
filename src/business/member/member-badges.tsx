import type { MemberStatus, TenantRoleName } from '@/generated/api-types'
import { ShieldCheckIcon } from '@gedatou/cadenza-icons'
import { Badge } from '@gedatou/cadenza-ui'
import { useTranslation } from 'react-i18next'

import { PlayOnHover } from '@/components/icon-motion'
import { cn } from '@/lib/utils'

import { sortTenantRoles, TENANT_ROLE_LABEL_KEYS } from './tenant-roles'

/** 租户角色 chips(显示名走 i18n,不显示机器码)。空 → muted 占位。 */
export function MemberRoleBadges({ roles, className }: { roles: TenantRoleName[], className?: string }) {
  const { t } = useTranslation('common')
  if (roles.length === 0) {
    return <span className={cn('text-xs text-muted-foreground', className)}>{t('users.noRoles')}</span>
  }
  return (
    <span className={cn('flex flex-wrap items-center gap-1', className)}>
      {sortTenantRoles(roles).map(role => (
        <PlayOnHover key={role}>
          <Badge
            className='gap-1'
            variant='secondary'
          >
            <ShieldCheckIcon className='size-3 opacity-60' />
            {t(TENANT_ROLE_LABEL_KEYS[role])}
          </Badge>
        </PlayOnHover>
      ))}
    </span>
  )
}

/** 成员状态:正常 = 低调的 outline,停用 = destructive 提示。 */
export function MemberStatusBadge({ status }: { status: MemberStatus }) {
  const { t } = useTranslation('common')
  return status === 'active'
    ? <Badge variant='outline'>{t('members.status.active')}</Badge>
    : <Badge variant='destructive'>{t('members.status.inactive')}</Badge>
}
