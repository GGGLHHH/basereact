import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import type { ColumnDef } from '@tanstack/react-table'
import type { Tenant } from '#/generated/api-types'

import { useCreateTenant, useTenants, useUpdateTenant } from '@/api/tenants'
import { formSubmitHandler, useAppForm } from '@/components/form'
import { DataTable } from '@/components/table/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Field, FieldGroup } from '@/components/field'
import { formatDateTime } from '@/lib/datetime'
import { getErrorMessage } from '@/lib/api-client'

/** 平台租户管理(superadmin)。列表 + 开通 + 停用/恢复。 */
export function TenantAdminPage() {
  const { t } = useTranslation('common')
  const { data: tenants, isPending } = useTenants()
  const updateTenant = useUpdateTenant()

  // 停用/恢复:PUT 全量替换(display_name 不变、status 翻转)。
  function toggleStatus(tenant: Tenant) {
    const next = tenant.status === 'active' ? 'suspended' : 'active'
    updateTenant.mutate(
      { id: tenant.id, request: { display_name: tenant.display_name, status: next } },
      {
        onSuccess: () => toast.success(t('tenantAdmin.admin.updated')),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    )
  }

  const columns = useMemo<ColumnDef<Tenant, unknown>[]>(
    () => [
      { accessorKey: 'display_name', header: t('tenantAdmin.columns.name') },
      {
        accessorKey: 'name',
        header: t('tenantAdmin.columns.slug'),
        cell: ({ row }) => <span className='text-muted-foreground'>{row.original.name}</span>,
      },
      {
        accessorKey: 'status',
        header: t('tenantAdmin.columns.status'),
        cell: ({ row }) => (
          <Badge variant={row.original.status === 'active' ? 'default' : 'secondary'}>
            {t(`tenantAdmin.status.${row.original.status}`)}
          </Badge>
        ),
      },
      {
        accessorKey: 'created_at',
        header: t('tenantAdmin.columns.createdAt'),
        cell: ({ row }) => formatDateTime(row.original.created_at),
      },
      {
        id: 'actions',
        header: t('tenantAdmin.columns.actions'),
        cell: ({ row }) => (
          <Button
            variant='outline'
            size='sm'
            disabled={updateTenant.isPending}
            onClick={() => toggleStatus(row.original)}
          >
            {row.original.status === 'active'
              ? t('tenantAdmin.admin.suspend')
              : t('tenantAdmin.admin.reactivate')}
          </Button>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, updateTenant.isPending],
  )

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex items-center justify-between'>
        <h1 className='text-lg font-semibold'>{t('tenantAdmin.admin.title')}</h1>
        <CreateTenantDialog />
      </div>
      <DataTable
        columns={columns}
        data={tenants ?? []}
        emptyMessage={t('tenantAdmin.admin.empty')}
        loading={{ isLoading: isPending, text: t('loading.loading') }}
      />
    </div>
  )
}

function CreateTenantDialog() {
  const { t } = useTranslation('common')
  const [open, setOpen] = useState(false)
  const createTenant = useCreateTenant()

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().min(2).max(64),
        display_name: z.string().min(1).max(128),
        admin_identifier: z.string().max(320),
      }),
    [],
  )

  const form = useAppForm({
    defaultValues: { name: '', display_name: '', admin_identifier: '' },
    validators: { onChange: schema },
    onSubmit: async ({ value }) => {
      try {
        await createTenant.mutateAsync({
          name: value.name,
          display_name: value.display_name,
          // 空串 = 不带初始 admin(后端接收 Option;省略字段即可)。
          admin_identifier: value.admin_identifier.trim() || undefined,
        })
      } catch (e) {
        toast.error(getErrorMessage(e))
        return
      }
      toast.success(t('tenantAdmin.admin.created'))
      form.reset()
      setOpen(false)
    },
  })

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
    >
      <DialogTrigger render={<Button size='sm'>{t('tenantAdmin.admin.create')}</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('tenantAdmin.admin.createTitle')}</DialogTitle>
          <DialogDescription>{t('tenantAdmin.admin.adminLabel')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={formSubmitHandler(form.handleSubmit)}>
          <FieldGroup>
            <form.AppField name='name'>
              {(field) => (
                <field.TextField
                  label={t('tenantAdmin.admin.nameLabel')}
                  placeholder={t('tenantAdmin.admin.namePlaceholder')}
                  required
                />
              )}
            </form.AppField>
            <form.AppField name='display_name'>
              {(field) => (
                <field.TextField
                  label={t('tenantAdmin.admin.displayNameLabel')}
                  placeholder={t('tenantAdmin.admin.displayNamePlaceholder')}
                  required
                />
              )}
            </form.AppField>
            <form.AppField name='admin_identifier'>
              {(field) => (
                <field.TextField
                  label={t('tenantAdmin.admin.adminLabel')}
                  placeholder={t('tenantAdmin.admin.adminPlaceholder')}
                />
              )}
            </form.AppField>
            <Field>
              <form.AppForm>
                <form.SubmitButton pendingLabel={t('tenantAdmin.admin.submitting')}>
                  {t('tenantAdmin.admin.submit')}
                </form.SubmitButton>
              </form.AppForm>
            </Field>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  )
}
