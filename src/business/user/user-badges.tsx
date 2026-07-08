import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// 账号即身份凭证:角色 = 权限 chips、邮箱验证 = 印章、机器 id = 等宽"编号"戳、
// 字段用大写微标签。跨 list/detail/edit 共用同一套词汇。

/**
 * 角色"权限"chips。空 → muted 占位。`max` 截断(表格单行用):超出显示 `+N`,
 * 配 `flex-nowrap` 不撑行高;详情页不传 max → 全展开可换行。
 */
export function RoleBadges({
  roles,
  max,
  className,
}: {
  roles: string[]
  max?: number
  className?: string
}) {
  const { t } = useTranslation('common')
  if (roles.length === 0) {
    return (
      <span className={cn('text-xs text-muted-foreground', className)}>{t('users.noRoles')}</span>
    )
  }
  const shown = max ? roles.slice(0, max) : roles
  const extra = roles.length - shown.length
  return (
    <span className={cn('flex flex-wrap items-center gap-1', className)}>
      {shown.map((role) => (
        <Badge
          key={role}
          className='gap-1'
          variant='secondary'
        >
          <span
            aria-hidden
            className='i-lucide-shield size-3 opacity-60'
          />
          {role}
        </Badge>
      ))}
      {extra > 0 ? <span className='text-xs text-muted-foreground'>+{extra}</span> : null}
    </span>
  )
}

/** 邮箱验证印章:已验证带 check(点 primary),否则 muted outline。 */
export function VerifiedBadge({ verified }: { verified: boolean }) {
  const { t } = useTranslation('common')
  return verified ? (
    <Badge
      className='gap-1 text-primary'
      variant='secondary'
    >
      <span
        aria-hidden
        className='i-lucide-badge-check size-3'
      />
      {t('users.verified')}
    </Badge>
  ) : (
    <Badge
      className='gap-1 text-muted-foreground'
      variant='outline'
    >
      <span
        aria-hidden
        className='i-lucide-shield-alert size-3'
      />
      {t('users.unverified')}
    </Badge>
  )
}

/** 机器 id 的"账号编号"戳:大写微标签 + 等宽 id。 */
export function AccountStamp({ label, id }: { label: ReactNode; id: string }) {
  return (
    <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
      <span className='font-medium tracking-wide uppercase'>{label}</span>
      <span className='truncate font-mono'>{id}</span>
    </div>
  )
}

/** 大写微标签 + 值的字段行(详情/编辑元信息共用)。 */
export function FieldRow({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className='flex flex-col gap-1'>
      <dt className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>{label}</dt>
      <dd className='text-sm wrap-break-word'>{value}</dd>
    </div>
  )
}
