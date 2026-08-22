import type { DataTableColumn } from '@gedatou/cadenza-ui'
import type { WidgetView } from '#/generated/api-types'
import { DataTableEmpty, DataTableLoadingOverlay } from '@gedatou/cadenza-ui'
import { getRouteApi } from '@tanstack/react-router'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { useWidgets } from '@/api/widgets'

import { AppDataPagination } from '@/components/table/app-data-pagination'
import { AutoFitDataTable } from '@/components/table/auto-fit-data-table'
import { toDataPagination } from '@/components/table/pagination'
import { formatDateTime } from '@/lib/datetime'

// 组件不在路由文件里,用 getRouteApi 按 id 取同一套类型安全 hooks(免与 ./widgets 互相 import)。
const route = getRouteApi('/admin/_shell/widgets')

export function WidgetsPage() {
  const { page, size } = route.useSearch()
  const navigate = route.useNavigate()
  const { t } = useTranslation('common')
  const { data, isPending } = useWidgets({ page, size })

  const columns = useMemo<DataTableColumn<WidgetView>[]>(
    () => [
      {
        id: 'name',
        header: t('widgets.columns.name'),
        rowHeader: true,
        cell: widget => widget.name,
      },
      {
        id: 'created_by',
        header: t('widgets.columns.createdBy'),
        cell: widget => widget.created_by_user?.username ?? '—',
      },
      {
        id: 'created_at',
        header: t('widgets.columns.createdAt'),
        cell: widget => formatDateTime(widget.created_at),
      },
      {
        id: 'updated_at',
        header: t('widgets.columns.updatedAt'),
        cell: widget => formatDateTime(widget.updated_at),
      },
    ],
    [t],
  )

  // PageInfo(union)→ 分页器 total 走 ACL(见 table/pagination),免手搓 union 窄化;
  // page/limit 由 URL search 控。
  const { total } = toDataPagination(data?.page_info)

  return (
    <>
      <AutoFitDataTable
        aria-label={t('widgets.tableLabel')}
        columns={columns}
        items={data?.items ?? []}
        isLoading={isPending}
      >
        <DataTableEmpty>{t('widgets.empty')}</DataTableEmpty>
        <DataTableLoadingOverlay>{t('loading.loading')}</DataTableLoadingOverlay>
      </AutoFitDataTable>
      <AppDataPagination
        limit={size}
        page={page}
        total={total}
        onLimitChange={(limit) => {
          // 必须 spread prev:整体替换 search 会把搜索词与筛选条件一起抹掉
          // (下面的 onPageChange 一直是对的,这条一直不是)。
          void navigate({ search: prev => ({ ...prev, page: 1, size: limit }) })
        }}
        onPageChange={(nextPage) => {
          void navigate({ search: prev => ({ ...prev, page: nextPage }) })
        }}
        count={data?.items.length ?? 0}
      />
    </>
  )
}
