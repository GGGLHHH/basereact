import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import type { AuthEvent } from '#/routes/admin/_shell/-auth-log/types'

import { DataTable } from '@/components/table/data-table'

import { createAuthEventColumns } from './auth-event-table-columns'

// 单行高。视口 maxHeight 由它 + limit 推导:满页刚好铺满不内滚(翻页负责换页),不满页
// 自然收短不留空。嵌在 dashboard 中段不能用 DataTable 的 autofit(会量到视口底,表在
// 页面很下面时高度被压没),所以显式给高。唯一写死值就是这一档行高。
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
    <DataTable
      columns={columns}
      data={data}
      emptyMessage={t('authLog.table.empty')}
      loading={{ isLoading: isLoading ?? false, text: t('loading.loading') }}
      maxHeight={40 + ROW_H * limit}
      rowHeight={ROW_H}
      pagination={{
        count: data.length,
        limit,
        page,
        total,
        summary: ({ count, total }) => t('pagination.summary', { count, total }),
        onLimitChange,
        onPageChange,
      }}
    />
  )
}
