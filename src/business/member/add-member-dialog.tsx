import type { TenantRoleName } from '@/generated/api-types'
import { fieldErrors } from '@gedatou/cadenza-form'
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
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import { useAddMember } from '@/api/members'
import { FieldGroup } from '@/components/field'
import { formProps, useAppForm } from '@/components/form'
import { clearServerError } from '@/components/form/server-error'
import { ApiErrorClass, getErrorMessage } from '@/lib/api-client'

import { tenantRolesSchema } from './member-form-schema'
import { TenantRoleCheckboxes } from './tenant-role-checkboxes'

interface AddMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * 租户管理员按**完整用户名**把已有账号加进本租户(spec §4.5:不提供全局账号的模糊搜索)。
 * 账号不存在(404 account_not_found)提示在用户名字段下,弹窗不关,改了再试;其它错误 toast。
 */
export function AddMemberDialog({ open, onOpenChange }: AddMemberDialogProps) {
  const { t } = useTranslation('common')
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogPopup>
        <DialogHeader>
          <DialogTitle>{t('members.addDialog.title')}</DialogTitle>
          <DialogDescription>{t('members.addDialog.description')}</DialogDescription>
        </DialogHeader>
        {/* 弹层关闭即卸载内容:每次打开都是一张新表单,不残留上次的输入和错误。 */}
        <AddMemberForm onAdded={() => onOpenChange(false)} />
      </DialogPopup>
    </Dialog>
  )
}

function AddMemberForm({ onAdded }: { onAdded: () => void }) {
  const { t } = useTranslation('common')
  const add = useAddMember()

  const schema = useMemo(
    () =>
      z.object({
        roles: tenantRolesSchema(t),
        // refine 判 trim 后非空(提交走 trim,校验同口径);不用 .trim() transform,见 user-create-page。
        username: z
          .string()
          .refine(value => value.trim().length > 0, t('members.addDialog.usernameRequired')),
      }),
    [t],
  )

  const defaultRoles: TenantRoleName[] = ['user']
  const form = useAppForm({
    defaultValues: { roles: defaultRoles, username: '' },
    validators: { onChange: schema },
    onSubmit: async ({ value }) => {
      try {
        await add.mutateAsync({ roles: value.roles, username: value.username.trim() })
      }
      catch (error) {
        const fieldKey = usernameErrorKey(error)
        if (fieldKey === undefined) {
          toast.error(getErrorMessage(error))
        }
        else {
          const message = t(fieldKey)
          form.setFieldMeta('username', prev => ({ ...prev, errorMap: { ...prev.errorMap, onServer: message } }))
        }
        return
      }
      toast.success(t('members.addDialog.success'))
      onAdded()
    },
  })

  return (
    <form {...formProps(form)}>
      <FieldGroup>
        <form.AppField
          listeners={{ onChange: clearServerError }}
          name='username'
        >
          {field => (
            <field.TextField
              autoComplete='off'
              label={t('members.addDialog.username')}
              placeholder={t('members.addDialog.usernamePlaceholder')}
              required
            />
          )}
        </form.AppField>
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
          <form.SubmitButton pendingLabel={t('action.saving')}>
            {t('members.addDialog.submit')}
          </form.SubmitButton>
        </form.AppForm>
      </DialogFooter>
    </form>
  )
}

/**
 * 只有「这个用户名没有账号」(404 且机器码 account_not_found)落到用户名字段上;
 * 其余(别的 404、409 已是成员 / 冲突、403 越权、网络……)返回 undefined 走通用错误 toast。
 */
function usernameErrorKey(error: unknown): 'members.addDialog.notFound' | undefined {
  return error instanceof ApiErrorClass && error.code === 'account_not_found'
    ? 'members.addDialog.notFound'
    : undefined
}
