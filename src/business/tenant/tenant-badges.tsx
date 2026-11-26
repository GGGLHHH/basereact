import type { TenantStatus } from '@/generated/api-types'
import { Badge } from '@gedatou/cadenza-ui'
import { useTranslation } from 'react-i18next'

/** 租户状态:正常 = outline,停用 = destructive。 */
export function TenantStatusBadge({ status }: { status: TenantStatus }) {
  const { t } = useTranslation('common')
  return status === 'active'
    ? <Badge variant='outline'>{t('tenants.status.active')}</Badge>
    : <Badge variant='destructive'>{t('tenants.status.suspended')}</Badge>
}
