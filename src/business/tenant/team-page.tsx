import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import type { ColumnDef } from '@tanstack/react-table'
import type { TenantMember } from '#/generated/api-types'

import { useInviteMember, useMyTenants, useRemoveMember, useTenantMembers } from '@/api/tenants'
import { formSubmitHandler, useAppForm } from '@/components/form'
import { DataTable } from '@/components/table/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Field, FieldGroup } from '@/components/field'
import { formatDateTime } from '@/lib/datetime'
import { ApiErrorClass, getErrorMessage } from '@/lib/api-client'

/**
 * 租户内成员管理(tn:admin 自助)。
 *
 * 前端不知道自己是不是当前租户的 admin(`MyTenantResponse` 不带 role,刻意的)——
 * 直接拉成员,**后端的活 tn:admin 检查**是权威:403 → 显示「你不是管理员」。
 * 这不是把安全交给前端,是让前端诚实地反映后端的裁决。
 */
export function TeamPage() {
  const { t } = useTranslation('common')
  const { data: tenants } = useMyTenants()
  const removeMember = useRemoveMember()
  const { data: members, isPending, error } = useTenantMembers()

  // 0 租户:没有公司,谈不上团队。
  if (tenants && tenants.length === 0) {
    return <EmptyState text={t('tenantAdmin.team.noTenant')} />
  }
  // 后端 403 = 你在这个租户里不是 admin(活的 tn:admin 检查裁决,前端只是照实反映)。
  if (error instanceof ApiErrorClass && error.status === 403) {
    return <EmptyState text={t('tenantAdmin.team.notAdmin')} />
  }

  const columns: ColumnDef<TenantMember, unknown>[] = [
    { accessorKey: 'username', header: t('tenantAdmin.columns.member') },
    {
      accessorKey: 'role',
      header: t('tenantAdmin.columns.role'),
      cell: ({ row }) => (
        <Badge variant={row.original.role === 'admin' ? 'default' : 'secondary'}>
          {t(`tenantAdmin.team.role${row.original.role === 'admin' ? 'Admin' : 'Member'}`)}
        </Badge>
      ),
    },
    {
      accessorKey: 'granted_at',
      header: t('tenantAdmin.columns.createdAt'),
      cell: ({ row }) => formatDateTime(row.original.granted_at),
    },
    {
      id: 'actions',
      header: t('tenantAdmin.columns.actions'),
      cell: ({ row }) => (
        <Button
          variant='outline'
          size='sm'
          disabled={removeMember.isPending}
          onClick={() =>
            removeMember.mutate(row.original.user_id, {
              onSuccess: () => toast.success(t('tenantAdmin.team.removed')),
              onError: (e) => toast.error(getErrorMessage(e)),
            })
          }
        >
          {t('tenantAdmin.team.remove')}
        </Button>
      ),
    },
  ]

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex items-center justify-between'>
        <h1 className='text-lg font-semibold'>{t('tenantAdmin.team.title')}</h1>
        <InviteMemberDialog />
      </div>
      <DataTable
        columns={columns}
        data={members ?? []}
        emptyMessage={t('tenantAdmin.team.empty')}
        loading={{ isLoading: isPending, text: t('loading.loading') }}
      />
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return <div className='rounded-md border p-8 text-center text-muted-foreground'>{text}</div>
}

function InviteMemberDialog() {
  const { t } = useTranslation('common')
  const [open, setOpen] = useState(false)
  const invite = useInviteMember()

  const schema = useMemo(
    () =>
      z.object({
        identifier: z.string().min(1).max(320),
        role: z.enum(['admin', 'member']),
      }),
    [],
  )

  const form = useAppForm({
    defaultValues: { identifier: '', role: 'member' as 'admin' | 'member' },
    validators: { onChange: schema },
    onSubmit: async ({ value }) => {
      try {
        await invite.mutateAsync({ identifier: value.identifier, role: value.role })
      } catch (e) {
        toast.error(getErrorMessage(e))
        return
      }
      toast.success(t('tenantAdmin.team.invited'))
      form.reset()
      setOpen(false)
    },
  })

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
    >
      <DialogTrigger render={<Button size='sm'>{t('tenantAdmin.team.invite')}</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('tenantAdmin.team.inviteTitle')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={formSubmitHandler(form.handleSubmit)}>
          <FieldGroup>
            <form.AppField name='identifier'>
              {(field) => (
                <field.TextField
                  label={t('tenantAdmin.team.identifierLabel')}
                  placeholder={t('tenantAdmin.team.identifierPlaceholder')}
                  required
                />
              )}
            </form.AppField>
            <form.AppField name='role'>
              {(field) => (
                <field.SelectField
                  label={t('tenantAdmin.team.roleLabel')}
                  placeholder={t('tenantAdmin.team.roleMember')}
                  options={[
                    { label: t('tenantAdmin.team.roleMember'), value: 'member' },
                    { label: t('tenantAdmin.team.roleAdmin'), value: 'admin' },
                  ]}
                />
              )}
            </form.AppField>
            <Field>
              <form.AppForm>
                <form.SubmitButton pendingLabel={t('tenantAdmin.team.submitting')}>
                  {t('tenantAdmin.team.submit')}
                </form.SubmitButton>
              </form.AppForm>
            </Field>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  )
}
