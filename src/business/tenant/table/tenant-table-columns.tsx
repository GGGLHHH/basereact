import type { DataTableColumn } from '@gedatou/cadenza-ui'
import type { TFunction } from 'i18next'
import type { TenantView } from '@/generated/api-types'
import { PauseIcon, PlayIcon, SettingsIcon } from '@gedatou/cadenza-icons'
import { Button } from '@gedatou/cadenza-ui'

import { PlayOnHover } from '@/components/icon-motion'
import { stopRowActivation } from '@/components/table/stop-row-activation'
import { formatDateTime } from '@/lib/datetime'

import { TenantStatusBadge } from '../tenant-badges'

export type TenantColumnDef = DataTableColumn<TenantView>

export interface TenantRowActions {
  onManage?: (tenant: TenantView) => void
  /** 停用 / 恢复(方向由当前状态决定);调用方负责弹确认框,不要直接改。 */
  onToggleStatus?: (tenant: TenantView) => void
}

function actionsColumn(t: TFunction<'common'>, actions: TenantRowActions): TenantColumnDef {
  return {
    id: 'actions',
    header: t('tenants.actions'),
    width: 96,
    pinned: 'end',
    hideable: false,
    cell: tenant => (
      <div className='flex items-center gap-0.5'>
        {actions.onManage
          ? (
              <PlayOnHover>
                <Button
                  aria-label={t('tenants.manage')}
                  onKeyDown={stopRowActivation}
                  onClick={(event) => {
                    event.stopPropagation()
                    actions.onManage?.(tenant)
                  }}
                  size='icon-sm'
                  variant='ghost'
                >
                  <SettingsIcon className='size-4' />
                </Button>
              </PlayOnHover>
            )
          : null}
        {actions.onToggleStatus
          ? (
              <PlayOnHover>
                <Button
                  aria-label={tenant.status === 'active' ? t('tenants.suspend.action') : t('tenants.resume.action')}
                  className={tenant.status === 'active' ? 'text-destructive hover:text-destructive' : undefined}
                  onKeyDown={stopRowActivation}
                  onClick={(event) => {
                    event.stopPropagation()
                    actions.onToggleStatus?.(tenant)
                  }}
                  size='icon-sm'
                  variant='ghost'
                >
                  {tenant.status === 'active' ? <PauseIcon className='size-4' /> : <PlayIcon className='size-4' />}
                </Button>
              </PlayOnHover>
            )
          : null}
      </div>
    ),
  }
}

export function createTenantColumns(t: TFunction<'common'>, actions?: TenantRowActions): TenantColumnDef[] {
  const columns: TenantColumnDef[] = [
    {
      id: 'name',
      header: t('tenants.columns.name'),
      rowHeader: true,
      hideable: false,
      cell: tenant => <span className='font-medium'>{tenant.name}</span>,
    },
    {
      id: 'slug',
      header: t('tenants.columns.slug'),
      cell: tenant => <span className='font-mono text-sm text-muted-foreground'>{tenant.slug}</span>,
    },
    {
      id: 'status',
      header: t('tenants.columns.status'),
      width: 110,
      cell: tenant => <TenantStatusBadge status={tenant.status} />,
    },
    {
      id: 'created_at',
      header: t('tenants.columns.createdAt'),
      cell: tenant => <span className='text-sm text-muted-foreground'>{formatDateTime(tenant.created_at)}</span>,
    },
  ]
  if (actions && (actions.onManage || actions.onToggleStatus)) {
    columns.push(actionsColumn(t, actions))
  }
  return columns
}
