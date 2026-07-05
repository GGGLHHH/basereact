import { createFileRoute } from '@tanstack/react-router'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import type { ColumnDef } from '@tanstack/react-table'
import type { WidgetView } from '#/generated/api-types'

import { useWidgets } from '@/api/widgets'
import { DataTable } from '@/components/table/data-table'
import { toDataPagination } from '@/components/table/pagination'
import { formatDateTime } from '@/lib/datetime'

// 非法/缺失一律回默认值(catch),不抛错误页;size 上限对齐后端 clamp [1,100]。
const widgetsSearchSchema = z.object({
  page: z.number().int().min(1).catch(1),
  size: z.number().int().min(1).max(100).catch(20),
})

export const Route = createFileRoute('/admin/_shell/widgets')({
  component: WidgetsPage,
  validateSearch: widgetsSearchSchema,
  staticData: {
    titleKey: 'adminWidgets',
    menuTitleKey: 'adminWidgets',
    icon: 'i-tabler-box',
    group: 'Admin',
    // 页面主数据就是这个操作,准入随它:缺 users:admin 时菜单不出现、直连进壳内 403。
    accessPolicyKeys: ['adminListWidgets'],
  },
})

function WidgetsPage() {
  const { page, size } = Route.useSearch()
  const navigate = Route.useNavigate()
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
          void navigate({ search: (prev) => ({ ...prev, page: nextPage }) })
        },
      }}
    />
  )
}
