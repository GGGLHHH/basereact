import type { MemberRowActions } from './member-table-columns'
import type { MemberView } from '@/generated/api-types'
import { DataTableEmpty, DataTableLoadingOverlay } from '@gedatou/cadenza-ui'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { AppDataPagination } from '@/components/table/app-data-pagination'
import { AutoFitDataTable } from '@/components/table/auto-fit-data-table'

import { createMemberColumns } from './member-table-columns'

interface MemberTableProps extends MemberRowActions {
  data: MemberView[]
  isLoading: boolean
  limit: number
  page: number
  total: number
  onLimitChange: (limit: number) => void
  onPageChange: (page: number) => void
  /** 不撑满剩余高度时给固定上限(组织详情页里成员表下面还有别的内容)。 */
  maxHeight?: number
  /** 当前登录账号:自己那一行不出操作按钮。 */
  currentUserId?: string
}

// 纯展示:数据 / 分页 / 操作 handler 都由调用方注入。本租户「成员」页与平台「租户详情」共用。
// 没传操作 handler(无 members:admin)就没有操作列。
export function MemberTable({
  data,
  isLoading,
  limit,
  page,
  total,
  onLimitChange,
  onPageChange,
  onEditRoles,
  onRemove,
  maxHeight,
  currentUserId,
  canManage,
}: MemberTableProps) {
  const { t } = useTranslation('common')
  const hasActions = Boolean(onEditRoles || onRemove)
  const columns = useMemo(
    () => createMemberColumns(t, hasActions ? { onEditRoles, onRemove, canManage } : undefined, currentUserId),
    [t, hasActions, onEditRoles, onRemove, canManage, currentUserId],
  )

  return (
    <>
      <AutoFitDataTable
        aria-label={t('members.tableLabel')}
        columns={columns}
        isLoading={isLoading}
        items={data}
        maxHeight={maxHeight}
      >
        <DataTableEmpty>{t('members.empty')}</DataTableEmpty>
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
