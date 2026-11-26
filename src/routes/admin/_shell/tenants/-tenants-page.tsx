import type { TenantView } from '@/generated/api-types'
import { PlusIcon } from '@gedatou/cadenza-icons'
import { Button } from '@gedatou/cadenza-ui'
import { getRouteApi } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useTenants } from '@/api/tenants'
import { CreateTenantDialog } from '@/business/tenant/create-tenant-dialog'
import { TenantTable } from '@/business/tenant/table'
import { TenantStatusDialog } from '@/business/tenant/tenant-status-dialog'
import { PlayOnHover } from '@/components/icon-motion'
import { toDataPagination } from '@/components/table/pagination'

const routeApi = getRouteApi('/admin/_shell/tenants/')

export function TenantsPage() {
  const { page, size } = routeApi.useSearch()
  const navigate = routeApi.useNavigate()
  const { t } = useTranslation('common')
  const { data, isPending } = useTenants({ page, size })
  const { total } = toDataPagination(data?.page_info)

  const [createOpen, setCreateOpen] = useState(false)
  // 待停用 / 恢复的目标即确认框开合信号。
  const [statusTarget, setStatusTarget] = useState<TenantView | null>(null)

  const goDetail = (tenant: Pick<TenantView, 'id'>) =>
    void navigate({ params: { tenantId: tenant.id }, to: '/admin/tenants/$tenantId' })

  return (
    <>
      <div className='flex items-center justify-end gap-2'>
        <PlayOnHover>
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon className='size-4' />
            {t('tenants.new')}
          </Button>
        </PlayOnHover>
      </div>
      <TenantTable
        data={data?.items ?? []}
        isLoading={isPending}
        limit={size}
        page={page}
        total={total}
        onLimitChange={(limit) => {
          void navigate({ resetScroll: false, search: prev => ({ ...prev, page: 1, size: limit }) })
        }}
        onManage={goDetail}
        onPageChange={(nextPage) => {
          void navigate({ resetScroll: false, search: prev => ({ ...prev, page: nextPage }) })
        }}
        onRowClick={goDetail}
        onToggleStatus={setStatusTarget}
      />
      <CreateTenantDialog
        open={createOpen}
        // 建好直接进详情:新租户还没有成员,下一步就是指定第一个管理员。
        onCreated={goDetail}
        onOpenChange={setCreateOpen}
      />
      <TenantStatusDialog
        open={statusTarget !== null}
        tenant={statusTarget}
        onOpenChange={(open) => {
          if (!open) {
            setStatusTarget(null)
          }
        }}
      />
    </>
  )
}
