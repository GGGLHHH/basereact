import type { TenantRowActions } from './tenant-table-columns'
import type { TenantView } from '@/generated/api-types'
import { DataTableEmpty, DataTableLoadingOverlay } from '@gedatou/cadenza-ui'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { AppDataPagination } from '@/components/table/app-data-pagination'
import { AutoFitDataTable } from '@/components/table/auto-fit-data-table'

import { createTenantColumns } from './tenant-table-columns'

interface TenantTableProps extends TenantRowActions {
  data: TenantView[]
  isLoading: boolean
  limit: number
  page: number
  total: number
  onLimitChange: (limit: number) => void
  onPageChange: (page: number) => void
  /** 整行点击(通常进详情)。操作列按钮各自截住事件,不误触。 */
  onRowClick?: (tenant: TenantView) => void
}

// 纯展示:数据 / 分页由调用方(路由,控 URL search)注入;操作 handler 也上提到调用方。
export function TenantTable({
  data,
  isLoading,
  limit,
  page,
  total,
  onLimitChange,
  onPageChange,
  onRowClick,
  onManage,
  onToggleStatus,
}: TenantTableProps) {
  const { t } = useTranslation('common')
  const hasActions = Boolean(onManage || onToggleStatus)
  const columns = useMemo(
    () => createTenantColumns(t, hasActions ? { onManage, onToggleStatus } : undefined),
    [t, hasActions, onManage, onToggleStatus],
  )

  return (
    <>
      <AutoFitDataTable
        aria-label={t('tenants.tableLabel')}
        columns={columns}
        isLoading={isLoading}
        items={data}
        onRowAction={onRowClick}
      >
        <DataTableEmpty>{t('tenants.empty')}</DataTableEmpty>
        <DataTableLoadingOverlay>{t('loading.loading')}</DataTableLoadingOverlay>
      </AutoFitDataTable>
      <AppDataPagination
        count={data.length}
        limit={limit}
        page={page}
        total={total}
        onLimitChange={onLimitChange}
        onPageChange={onPageChange}
      />
    </>
  )
}
