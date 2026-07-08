import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import type { AdminUserView } from '#/generated/api-types'

import { DataTable } from '@/components/table/data-table'

import { createUserColumns, type UserRowActions } from './user-table-columns'

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
    <DataTable
      columns={columns}
      data={data}
      emptyMessage={t('users.empty')}
      loading={{ isLoading, text: t('loading.loading') }}
      onRowClick={onRowClick}
      pinnedColumns={hasActions ? { right: ['actions'] } : undefined}
      pagination={{
        count: data.length,
        limit,
        page,
        summary: ({ count, total }) => t('pagination.summary', { count, total }),
        total,
        onLimitChange,
        onPageChange,
      }}
    />
  )
}
