import type { AuthEvent } from '#/routes/admin/_shell/-auth-log/types'
import { DataPagination, DataTable, DataTableEmpty, DataTableLoadingOverlay } from '@gedatou/cadenza-ui'
import { useMemo } from 'react'

import { useTranslation } from 'react-i18next'

import { createAuthEventColumns } from './auth-event-table-columns'

// 单行高。视口 maxHeight 由它 + limit 推导:满页刚好铺满不内滚(翻页负责换页),不满页
// 自然收短不留空。嵌在 dashboard 中段不能用自适应高度(会量到视口底,表在页面很下面时
// 高度被压没),所以显式给高 —— 也因此这里直接用库版 DataTable,不走 AutoFitDataTable。
// 唯一写死值就是这一档行高。
const ROW_H = 44

interface AuthEventTableProps {
  data: AuthEvent[]
  isLoading?: boolean
  limit: number
  page: number
  total: number
  onLimitChange: (limit: number) => void
  onPageChange: (page: number) => void
}

// 纯展示:数据/分页由调用方(auth-log 路由,客户端 recent 流过滤 + 切片)注入。与 user-table 一致。
export function AuthEventTable({
  data,
  isLoading,
  limit,
  page,
  total,
  onLimitChange,
  onPageChange,
}: AuthEventTableProps) {
  const { t } = useTranslation('common')
  const columns = useMemo(() => createAuthEventColumns(t), [t])

  return (
    <>
      <DataTable
        aria-label={t('authLog.table.title')}
        columns={columns}
        items={data}
        isLoading={isLoading ?? false}
        maxHeight={40 + ROW_H * limit}
        rowHeight={ROW_H}
      >
        <DataTableEmpty>{t('authLog.table.empty')}</DataTableEmpty>
        <DataTableLoadingOverlay>{t('loading.loading')}</DataTableLoadingOverlay>
      </DataTable>
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
        summary={({ total: rowTotal }) => t('pagination.summary', { count: data.length, total: rowTotal })}
      />
    </>
  )
}
