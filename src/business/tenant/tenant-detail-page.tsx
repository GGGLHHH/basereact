import type { MemberView, TenantView } from '@/generated/api-types'
import { PauseIcon, PlayIcon, UserPlusIcon } from '@gedatou/cadenza-icons'
import {
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@gedatou/cadenza-ui'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import {
  usePutTenantMember,
  useRemoveTenantMember,
  useTenant,
  useTenantMembers,
  useUpdateTenant,
} from '@/api/tenants'
import { EditMemberRolesDialog } from '@/business/member/edit-member-roles-dialog'
import { RemoveMemberDialog } from '@/business/member/remove-member-dialog'
import { MemberTable } from '@/business/member/table'
import { canManageMember } from '@/business/user/roles'
import { AccountStamp, FieldRow } from '@/business/user/user-badges'
import { Field } from '@/components/field'
import { formProps, useAppForm } from '@/components/form'
import { PlayOnHover } from '@/components/icon-motion'
import { toDataPagination } from '@/components/table/pagination'
import { getErrorMessage } from '@/lib/api-client'
import { formatDateTime } from '@/lib/datetime'
import { useMyPermissions, usePolicyGranted } from '@/lib/use-access-policy'
import { useCurrentUserId } from '@/lib/use-current-session'

import { AddTenantMemberDialog } from './add-tenant-member-dialog'
import { TenantStatusBadge } from './tenant-badges'
import { TenantStatusDialog } from './tenant-status-dialog'

// 成员表在页面中段,不撑满剩余高度:给一个固定上限,超出在表内滚动(cadenza DataTable 自带滚动区)。
const MEMBER_TABLE_MAX_HEIGHT = 440

/** 平台「租户详情」:基本信息(改名)、状态(停用 / 恢复)、成员(加人 / 改角色 / 移除)。 */
export function TenantDetailPage({ tenantId }: { tenantId: string }) {
  const { t } = useTranslation('common')
  const { data: tenant } = useTenant(tenantId)
  const [statusOpen, setStatusOpen] = useState(false)

  // loader 已 ensure;冷进兜底不渲染(404 由路由 errorComponent 接)。
  if (!tenant) {
    return null
  }

  return (
    <div className='mx-auto flex w-full max-w-5xl flex-col gap-4'>
      <Card>
        <CardHeader>
          <div className='flex min-w-0 flex-col gap-1'>
            <div className='flex flex-wrap items-center gap-2'>
              <h1 className='truncate text-xl font-semibold'>{tenant.name}</h1>
              <TenantStatusBadge status={tenant.status} />
            </div>
            <p className='truncate font-mono text-sm text-muted-foreground'>{tenant.slug}</p>
            <AccountStamp
              id={tenant.id}
              label={t('tenants.detail.id')}
            />
          </div>
        </CardHeader>
        <CardContent>
          <dl className='grid gap-4 sm:grid-cols-2'>
            <FieldRow
              label={t('tenants.columns.createdAt')}
              value={formatDateTime(tenant.created_at)}
            />
          </dl>
        </CardContent>
      </Card>

      <div className='grid gap-4 md:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>{t('tenants.detail.info')}</CardTitle>
            <CardDescription>{t('tenants.detail.infoDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            {/* 换租户 / 名字被别处改了 → 重挂载,表单按新值播种。 */}
            <RenameTenantForm
              key={`${tenant.id}:${tenant.name}`}
              tenant={tenant}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('tenants.detail.statusTitle')}</CardTitle>
            <CardDescription>
              {tenant.status === 'active' ? t('tenants.detail.statusActive') : t('tenants.detail.statusSuspended')}
            </CardDescription>
          </CardHeader>
          <CardContent className='flex justify-end'>
            <PlayOnHover>
              <Button
                onClick={() => setStatusOpen(true)}
                variant={tenant.status === 'active' ? 'destructive' : 'default'}
              >
                {tenant.status === 'active' ? <PauseIcon className='size-4' /> : <PlayIcon className='size-4' />}
                {tenant.status === 'active' ? t('tenants.suspend.action') : t('tenants.resume.action')}
              </Button>
            </PlayOnHover>
          </CardContent>
        </Card>
      </div>

      <TenantMembersCard tenantId={tenant.id} />

      <TenantStatusDialog
        open={statusOpen}
        tenant={tenant}
        onOpenChange={setStatusOpen}
      />
    </div>
  )
}

function RenameTenantForm({ tenant }: { tenant: TenantView }) {
  const { t } = useTranslation('common')
  const update = useUpdateTenant()
  const schema = useMemo(
    () =>
      z.object({
        name: z.string().refine((value) => {
          const length = value.trim().length
          return length > 0 && length <= 100
        }, t('tenants.create.nameInvalid')),
      }),
    [t],
  )
  const form = useAppForm({
    defaultValues: { name: tenant.name },
    validators: { onChange: schema },
    onSubmit: async ({ value }) => {
      try {
        // PUT 全量:状态原样带上,只改名。
        await update.mutateAsync({ id: tenant.id, request: { name: value.name.trim(), status: tenant.status } })
      }
      catch (error) {
        toast.error(getErrorMessage(error))
        return
      }
      toast.success(t('tenants.detail.renamed'))
    },
  })

  return (
    <form {...formProps(form)}>
      <form.AppField name='name'>
        {field => (
          <field.TextField
            autoComplete='off'
            label={t('tenants.columns.name')}
            required
          />
        )}
      </form.AppField>
      <Field
        className='justify-end'
        orientation='horizontal'
      >
        <form.AppForm>
          <form.SubmitButton pendingLabel={t('action.saving')}>{t('action.save')}</form.SubmitButton>
        </form.AppForm>
      </Field>
    </form>
  )
}

function TenantMembersCard({ tenantId }: { tenantId: string }) {
  const { t } = useTranslation('common')
  // 成员表的分页只在这张卡片里有意义,放局部 state(URL search 留给页面主数据)。
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(20)
  const { data, isPending } = useTenantMembers(tenantId, { page, size })
  const { total } = toDataPagination(data?.page_info)
  const put = usePutTenantMember()
  const remove = useRemoveTenantMember()
  const currentUserId = useCurrentUserId()
  // 持平台角色的成员只有 platform:roles 能改角色 / 移出(平台管理员看不到这两个按钮,后端兜底 403)
  const permissions = useMyPermissions()
  // 「添加成员」要从平台账号目录(listUsers)里选人;没有这个权限就不给入口。
  const canPickAccounts = usePolicyGranted('listUsers')

  const [addOpen, setAddOpen] = useState(false)
  const [rolesTarget, setRolesTarget] = useState<MemberView | null>(null)
  const [removeTarget, setRemoveTarget] = useState<MemberView | null>(null)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('tenants.detail.members')}</CardTitle>
        <CardDescription>{t('tenants.detail.membersDescription')}</CardDescription>
        {canPickAccounts
          ? (
              <CardAction>
                <PlayOnHover>
                  <Button onClick={() => setAddOpen(true)}>
                    <UserPlusIcon className='size-4' />
                    {t('tenants.detail.addMember')}
                  </Button>
                </PlayOnHover>
              </CardAction>
            )
          : null}
      </CardHeader>
      <CardContent className='flex flex-col gap-2'>
        <MemberTable
          canManage={member => canManageMember(member, permissions)}
          currentUserId={currentUserId}
          data={data?.items ?? []}
          isLoading={isPending}
          limit={size}
          maxHeight={MEMBER_TABLE_MAX_HEIGHT}
          page={page}
          total={total}
          onEditRoles={setRolesTarget}
          onLimitChange={(limit) => {
            setPage(1)
            setSize(limit)
          }}
          onPageChange={setPage}
          onRemove={setRemoveTarget}
        />
      </CardContent>
      <AddTenantMemberDialog
        open={addOpen}
        tenantId={tenantId}
        onOpenChange={setAddOpen}
      />
      <EditMemberRolesDialog
        member={rolesTarget}
        open={rolesTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRolesTarget(null)
          }
        }}
        onSubmit={async (roles) => {
          if (rolesTarget) {
            await put.mutateAsync({ roles, tenantId, userId: rolesTarget.id })
          }
        }}
      />
      <RemoveMemberDialog
        member={removeTarget}
        open={removeTarget !== null}
        onConfirm={async () => {
          if (removeTarget) {
            await remove.mutateAsync({ tenantId, userId: removeTarget.id })
          }
        }}
        onOpenChange={(open) => {
          if (!open) {
            setRemoveTarget(null)
          }
        }}
      />
    </Card>
  )
}
