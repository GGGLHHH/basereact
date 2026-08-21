import type { ColumnDef } from '@tanstack/react-table'
import type { WidgetView } from '#/generated/api-types'
import { getRouteApi } from '@tanstack/react-router'
import { useMemo } from 'react'

import { useTranslation } from 'react-i18next'

import { useWidgets } from '@/api/widgets'
import { DataTable } from '@/components/table/data-table'
import { toDataPagination } from '@/components/table/pagination'
import { formatDateTime } from '@/lib/datetime'

// 组件不在路由文件里,用 getRouteApi 按 id 取同一套类型安全 hooks(免与 ./widgets 互相 import)。
const route = getRouteApi('/admin/_shell/widgets')

export function WidgetsPage() {
  const { page, size } = route.useSearch()
  const navigate = route.useNavigate()
  const { t } = useTranslation('common')
  const { data, isPending } = useWidgets({ page, size })

  const columns = useMemo<ColumnDef<WidgetView, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: t('widgets.columns.name'),
      },
      {
        id: 'created_by',
        header: t('widgets.columns.createdBy'),
        cell: ({ row }) => row.original.created_by_user?.username ?? '—',
      },
      {
        accessorKey: 'created_at',
        header: t('widgets.columns.createdAt'),
        cell: ({ row }) => formatDateTime(row.original.created_at),
      },
      {
        accessorKey: 'updated_at',
        header: t('widgets.columns.updatedAt'),
        cell: ({ row }) => formatDateTime(row.original.updated_at),
      },
    ],
    [t],
  )

  // PageInfo(union)→ 分页器 total 走 ACL(见 table/pagination),免手搓 union 窄化;
  // page/limit 由 URL search 控。
  const { total } = toDataPagination(data?.page_info)

  return (
    <DataTable
      columns={columns}
      data={data?.items ?? []}
      emptyMessage={t('widgets.empty')}
      loading={{ isLoading: isPending, text: t('loading.loading') }}
      pagination={{
        count: data?.items.length ?? 0,
        limit: size,
        page,
        summary: ({ count, total }) => t('pagination.summary', { count, total }),
        total,
        onLimitChange: (limit) => {
          void navigate({ search: { page: 1, size: limit } })
        },
        onPageChange: (nextPage) => {
          void navigate({ search: prev => ({ ...prev, page: nextPage }) })
        },
      }}
    />
  )
}
