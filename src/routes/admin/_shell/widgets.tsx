import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import type { ColumnDef } from '@tanstack/react-table'
import type { WidgetView } from '#/generated/api-types'

import { useWidgets } from '@/api/widgets'
import { DataTable } from '@/components/table/data-table'
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

const columns: ColumnDef<WidgetView, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    id: 'created_by',
    header: 'Created by',
    cell: ({ row }) => row.original.created_by_user?.username ?? '—',
  },
  {
    accessorKey: 'created_at',
    header: 'Created at',
    cell: ({ row }) => formatDateTime(row.original.created_at),
  },
  {
    accessorKey: 'updated_at',
    header: 'Updated at',
    cell: ({ row }) => formatDateTime(row.original.updated_at),
  },
]

function WidgetsPage() {
  const { page, size } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data, isPending } = useWidgets({ page, size })

  const pageInfo = data?.page_info
  const total = (pageInfo && 'total' in pageInfo ? pageInfo.total : null) ?? 0

  return (
    <DataTable
      columns={columns}
      data={data?.items ?? []}
      emptyMessage='No widgets yet'
      loading={{ isLoading: isPending, text: 'Loading...' }}
      pagination={{
        limit: size,
        page,
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
