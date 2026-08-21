import type { AdminUserView } from '#/generated/api-types'
import type { UserRowActions } from './user-table-columns'

import { DataPagination, DataTableEmpty, DataTableLoadingOverlay } from '@gedatou/cadenza-ui'
import { useMemo } from 'react'

import { useTranslation } from 'react-i18next'

import { AutoFitDataTable } from '@/components/table/auto-fit-data-table'
import { createUserColumns } from './user-table-columns'

interface UserTableProps extends UserRowActions {
  data: AdminUserView[]
  isLoading: boolean
  limit: number
  page: number
  total: number
  onLimitChange: (limit: number) => void
  onPageChange: (page: number) => void
  /** 整行点击(通常跳详情)。操作列按钮各自 stopPropagation,不误触。 */
  onRowClick?: (user: AdminUserView) => void
}

// 纯展示:数据/分页由调用方(路由,控 URL search)注入;操作 handler 也上提到调用方。
export function UserTable({
  data,
  isLoading,
  limit,
  page,
  total,
  onLimitChange,
  onPageChange,
  onRowClick,
  onView,
  onEdit,
  onDelete,
}: UserTableProps) {
  const { t } = useTranslation('common')
  const hasActions = Boolean(onView || onEdit || onDelete)
  const columns = useMemo(
    () => createUserColumns(t, hasActions ? { onView, onEdit, onDelete } : undefined),
    [t, hasActions, onView, onEdit, onDelete],
  )

  return (
    <>
      <AutoFitDataTable
        aria-label={t('users.tableLabel')}
        columns={columns}
        items={data}
        isLoading={isLoading}
        onRowAction={onRowClick}
      >
        {/* 空态与加载态在 cadenza 里是插槽而不是字符串 prop —— 库本身零文案。 */}
        <DataTableEmpty>{t('users.empty')}</DataTableEmpty>
        <DataTableLoadingOverlay>{t('loading.loading')}</DataTableLoadingOverlay>
      </AutoFitDataTable>
      {/* 分页条不再由表格内嵌渲染,变成它的兄弟节点(cadenza 的 DataTable 不管分页)。 */}
      <DataPagination
        limit={limit}
        page={page}
        total={total}
        onLimitChange={onLimitChange}
        onPageChange={onPageChange}
        rowsPerPageLabel={t('pagination.rowsPerPage')}
        firstPageLabel={t('pagination.firstPage')}
        previousPageLabel={t('pagination.previousPage')}
        nextPageLabel={t('pagination.nextPage')}
        lastPageLabel={t('pagination.lastPage')}
        pageIndicator={({ page: current, totalPages }) =>
          t('pagination.pageOf', { page: current, totalPages })}
        // summary 的入参丢了 count(库版只给 page/limit/total/totalPages),
        // 当前页行数从这里的闭包取。
        summary={({ total: rowTotal }) => t('pagination.summary', { count: data.length, total: rowTotal })}
      />
    </>
  )
}
