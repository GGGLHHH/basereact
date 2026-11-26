import type { MemberView, TenantRoleName } from '@/generated/api-types'
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

import { formProps, useAppForm } from '@/components/form'
import { useOpenSnapshot } from '@/hooks/use-open-snapshot'
import { getErrorMessage } from '@/lib/api-client'

import { tenantRolesSchema } from './member-form-schema'
import { TenantRoleCheckboxes } from './tenant-role-checkboxes'
import { sortTenantRoles } from './tenant-roles'

interface EditMemberRolesDialogProps {
  /** null = 无目标(弹窗仍受 open 控制)。 */
  member: Pick<MemberView, 'display_name' | 'id' | 'roles' | 'username'> | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * 真正的保存:本租户成员页接 setMemberRoles,平台租户详情页接 putTenantMember。
   * 失败抛错 → 弹窗 toast 并留着;成功 → 关闭。
   */
  onSubmit: (roles: TenantRoleName[]) => Promise<unknown>
}

/** 改某成员的租户角色(全量替换)。两处共用,保存动作由调用方注入。 */
export function EditMemberRolesDialog({ member: memberProp, open, onOpenChange, onSubmit }: EditMemberRolesDialogProps) {
  const { t } = useTranslation('common')
  // 打开时快照:关闭时调用方把目标清成 null,关闭动画期间表单不该被卸掉、标题不该变空。
  const member = useOpenSnapshot(open, memberProp)
  const name = member ? (member.display_name ?? '') || member.username : ''
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogPopup>
        <DialogHeader>
          <DialogTitle>{t('members.editRoles.title')}</DialogTitle>
          <DialogDescription>{t('members.editRoles.description', { name })}</DialogDescription>
        </DialogHeader>
        {member
          ? (
              <EditMemberRolesForm
                // 换人即重挂载:表单只在挂载时取 defaultValues。
                key={member.id}
                initialRoles={member.roles}
                onSaved={() => onOpenChange(false)}
                onSubmit={onSubmit}
              />
            )
          : null}
      </DialogPopup>
    </Dialog>
  )
}

function EditMemberRolesForm({ initialRoles, onSubmit, onSaved }: {
  initialRoles: TenantRoleName[]
  onSubmit: (roles: TenantRoleName[]) => Promise<unknown>
  onSaved: () => void
}) {
  const { t } = useTranslation('common')
  const schema = useMemo(() => z.object({ roles: tenantRolesSchema(t) }), [t])
  const form = useAppForm({
    defaultValues: { roles: sortTenantRoles(initialRoles) },
    validators: { onChange: schema },
    onSubmit: async ({ value }) => {
      try {
        await onSubmit(value.roles)
      }
      catch (error) {
        toast.error(getErrorMessage(error))
        return
      }
      toast.success(t('members.editRoles.success'))
      onSaved()
    },
  })

  return (
    <form {...formProps(form)}>
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
      <DialogFooter>
        <DialogClose render={<Button variant='outline' />}>{t('action.cancel')}</DialogClose>
        <form.AppForm>
          <form.SubmitButton pendingLabel={t('action.saving')}>{t('action.save')}</form.SubmitButton>
        </form.AppForm>
      </DialogFooter>
    </form>
  )
}
