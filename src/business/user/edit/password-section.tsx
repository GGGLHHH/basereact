import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import { useResetUserPassword } from '@/api/users'
import { formSubmitHandler, useAppForm } from '@/components/form'
import { Field, FieldGroup } from '@/components/field'
import { getErrorMessage } from '@/lib/api-client'

import { EditSectionCard } from './section-card'

// 管理员重置密码 → resetUserPassword(无需旧密码)。成功后清空输入。
export function PasswordSection({ userId }: { userId: string }) {
  const { t } = useTranslation('common')
  const reset = useResetUserPassword()

  const schema = useMemo(
    () => z.object({ newPassword: z.string().min(3, t('users.validation.passwordMin')) }),
    [t],
  )

  const form = useAppForm({
    defaultValues: { newPassword: '' },
    validators: { onChange: schema },
    onSubmit: async ({ value }) => {
      try {
        await reset.mutateAsync({ id: userId, newPassword: value.newPassword })
      } catch (error) {
        toast.error(getErrorMessage(error))
        return
      }
      toast.success(t('users.edit.passwordReset'))
      form.reset()
    },
  })

  return (
    <EditSectionCard
      description={t('users.edit.passwordDescription')}
      title={t('users.edit.passwordTitle')}
    >
      <form onSubmit={formSubmitHandler(form.handleSubmit)}>
        <FieldGroup>
          <form.AppField name='newPassword'>
            {(field) => (
              <field.PasswordField
                autoComplete='new-password'
                label={t('users.form.newPassword')}
                placeholder={t('users.form.newPasswordPlaceholder')}
                required
              />
            )}
          </form.AppField>
          <Field
            className='justify-end'
            orientation='horizontal'
          >
            <form.AppForm>
              <form.SubmitButton pendingLabel={t('action.saving')}>
                {t('users.edit.passwordButton')}
              </form.SubmitButton>
            </form.AppForm>
          </Field>
        </FieldGroup>
      </form>
    </EditSectionCard>
  )
}
