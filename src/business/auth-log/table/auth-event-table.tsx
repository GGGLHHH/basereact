import type { AuthEvent } from '#/routes/admin/_shell/-auth-log/types'
import { DataTable, DataTableEmpty, DataTableLoadingOverlay } from '@gedatou/cadenza-ui'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { AppDataPagination } from '@/components/table/app-data-pagination'

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
        // virtualized 必须显式开:cadenza 的 rowHeight 只在虚拟化下写进行高
        // (style blockSize),关着的话行是自然高度,上面这条按 ROW_H 推出来的
        // maxHeight 就对不上「满页刚好铺满不内滚」了。迁移前的 DataTable 无条件虚拟化。
        rowHeight={ROW_H}
        virtualized
      >
        <DataTableEmpty>{t('authLog.table.empty')}</DataTableEmpty>
        <DataTableLoadingOverlay>{t('loading.loading')}</DataTableLoadingOverlay>
      </DataTable>
      <AppDataPagination
        limit={limit}
        page={page}
        total={total}
        onLimitChange={onLimitChange}
        onPageChange={onPageChange}
        count={data.length}
      />
    </>
  )
}
