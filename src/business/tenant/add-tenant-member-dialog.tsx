import type { AdminUserView, TenantRoleName } from '@/generated/api-types'
import { fieldErrors } from '@gedatou/cadenza-form'
import { ChevronDownIcon } from '@gedatou/cadenza-icons'
import {
  Button,
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogTitle,
} from '@gedatou/cadenza-ui'
import { useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import { usePutTenantMember } from '@/api/tenants'
import { tenantRolesSchema } from '@/business/member/member-form-schema'
import { TenantRoleCheckboxes } from '@/business/member/tenant-role-checkboxes'
import { UserInfiniteSelect } from '@/business/user/select/user-infinite-select'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/field'
import { formProps, useAppForm } from '@/components/form'
import { HostHoverIcon } from '@/components/icon-motion'
import { getErrorMessage } from '@/lib/api-client'
import { cn } from '@/lib/utils'

interface AddTenantMemberDialogProps {
  tenantId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * 平台管理员给某个租户加成员(常用来指定新租户的第一个管理员)。账号从平台账号目录里选
 * (平台管理员本来就能看全部账号);PUT 语义:已是成员就用这里的角色替换。
 */
export function AddTenantMemberDialog({ tenantId, open, onOpenChange }: AddTenantMemberDialogProps) {
  const { t } = useTranslation('common')
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogPopup>
        <DialogHeader>
          <DialogTitle>{t('tenants.detail.addMember')}</DialogTitle>
          <DialogDescription>{t('tenants.detail.addMemberDescription')}</DialogDescription>
        </DialogHeader>
        <AddTenantMemberForm
          onSaved={() => onOpenChange(false)}
          tenantId={tenantId}
        />
      </DialogPopup>
    </Dialog>
  )
}

function AddTenantMemberForm({ tenantId, onSaved }: { tenantId: string, onSaved: () => void }) {
  const { t } = useTranslation('common')
  const put = usePutTenantMember()
  const accountTriggerId = useId()
  // 表单只存 id(writing-cadenza-forms:InfiniteCombobox 存 id 不存对象),展示用的对象放局部 state。
  const [picked, setPicked] = useState<AdminUserView | null>(null)

  const schema = useMemo(
    () =>
      z.object({
        roles: tenantRolesSchema(t),
        userId: z.string().nullable().refine(value => value !== null, t('tenants.detail.accountRequired')),
      }),
    [t],
  )

  // 平台管理员在这里多半是给新租户指定第一个管理员,角色默认勾「管理员」。
  const defaultRoles: TenantRoleName[] = ['admin']
  const form = useAppForm({
    // 断言而非带注解的 const:后者会被控制流收窄成 null,字段类型就丢了 string。
    defaultValues: { roles: defaultRoles, userId: null as string | null },
    validators: { onChange: schema },
    onSubmit: async ({ value }) => {
      if (value.userId === null) {
        return
      }
      try {
        await put.mutateAsync({ roles: value.roles, tenantId, userId: value.userId })
      }
      catch (error) {
        toast.error(getErrorMessage(error))
        return
      }
      toast.success(t('tenants.detail.memberSaved'))
      onSaved()
    },
  })

  return (
    <form {...formProps(form)}>
      <FieldGroup>
        <form.Field name='userId'>
          {(field) => {
            const errors = fieldErrors(field)
            const invalid = errors.length > 0
            const errorId = `${accountTriggerId}-error`
            return (
              <Field data-invalid={invalid || undefined}>
                <FieldLabel
                  htmlFor={accountTriggerId}
                  required
                >
                  {t('tenants.detail.account')}
                </FieldLabel>
                <UserInfiniteSelect
                  onOpenChange={(nextOpen) => {
                    if (!nextOpen) {
                      field.handleBlur()
                    }
                  }}
                  onValueChange={(user) => {
                    setPicked(user)
                    field.handleChange(user?.id ?? null)
                  }}
                  value={field.state.value}
                >
                  <Button
                    aria-describedby={errorId}
                    aria-invalid={invalid}
                    className='w-full justify-between'
                    id={accountTriggerId}
                    type='button'
                    variant='outline'
                  >
                    <span className={cn('truncate', picked === null && 'text-muted-foreground')}>
                      {picked === null
                        ? t('tenants.detail.accountPlaceholder')
                        : (picked.display_name ?? '') === ''
                            ? picked.username
                            : `${picked.display_name ?? ''} (@${picked.username})`}
                    </span>
                    <HostHoverIcon
                      className='size-4 shrink-0 opacity-50'
                      icon={ChevronDownIcon}
                    />
                  </Button>
                </UserInfiniteSelect>
                <FieldError
                  errors={errors}
                  id={errorId}
                />
              </Field>
            )
          }}
        </form.Field>
        <form.Field name='roles'>
          {field => (
            <TenantRoleCheckboxes
              errors={fieldErrors(field)}
              onBlur={field.handleBlur}
              onValueChange={roles => field.handleChange(roles)}
              value={field.state.value}
            />
          )}
        </form.Field>
      </FieldGroup>
      <DialogFooter>
        <DialogClose render={<Button variant='outline' />}>{t('action.cancel')}</DialogClose>
        <form.AppForm>
          <form.SubmitButton pendingLabel={t('action.saving')}>{t('action.save')}</form.SubmitButton>
        </form.AppForm>
      </DialogFooter>
    </form>
  )
}
