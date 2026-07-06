import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import type { AdminUserView } from '#/generated/api-types'

import { DataTable } from '@/components/table/data-table'

import { createUserColumns } from './user-table-columns'

interface UserTableProps {
  data: AdminUserView[]
  isLoading: boolean
  limit: number
  page: number
  total: number
  onLimitChange: (limit: number) => void
  onPageChange: (page: number) => void
}

// 纯展示:数据/分页由调用方(路由,控 URL search)注入。
export function UserTable({
  data,
  isLoading,
  limit,
  page,
  total,
  onLimitChange,
  onPageChange,
}: UserTableProps) {
  const { t } = useTranslation('common')
  const columns = useMemo(() => createUserColumns(t), [t])

  return (
    <DataTable
      columns={columns}
      data={data}
      emptyMessage={t('users.empty')}
      loading={{ isLoading, text: t('loading.loading') }}
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
