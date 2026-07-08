import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import type { AdminUserView } from '#/generated/api-types'

import { useUpdateUser } from '@/api/users'
import { formSubmitHandler, useAppForm } from '@/components/form'
import { Field, FieldGroup } from '@/components/field'
import { getErrorMessage } from '@/lib/api-client'

import { EditSectionCard } from './section-card'

// 账号身份(username/email)→ updateUser(PUT 全量,email 空=清空)。独立保存。
export function AccountSection({ user }: { user: AdminUserView }) {
  const { t } = useTranslation('common')
  const update = useUpdateUser()

  const schema = useMemo(
    () =>
      z.object({
        email: z.string(),
        username: z
          .string()
          .refine((value) => value.trim().length > 0, t('users.validation.usernameRequired')),
      }),
    [t],
  )

  const form = useAppForm({
    defaultValues: { email: user.email ?? '', username: user.username },
    validators: { onChange: schema },
    onSubmit: async ({ value }) => {
      try {
        await update.mutateAsync({
          id: user.id,
          request: { email: value.email.trim() || null, username: value.username.trim() },
        })
      } catch (error) {
        toast.error(getErrorMessage(error))
        return
      }
      toast.success(t('users.edit.success'))
    },
  })

  return (
    <EditSectionCard
      description={t('users.edit.accountDescription')}
      title={t('users.edit.accountTitle')}
    >
      <form onSubmit={formSubmitHandler(form.handleSubmit)}>
        <FieldGroup>
          <form.AppField name='username'>
            {(field) => (
              <field.TextField
                label={t('users.columns.username')}
                placeholder={t('users.form.usernamePlaceholder')}
                required
              />
            )}
          </form.AppField>
          <form.AppField name='email'>
            {(field) => (
              <field.TextField
                label={t('users.columns.email')}
                placeholder={t('users.form.emailPlaceholder')}
                type='email'
              />
            )}
          </form.AppField>
          <Field
            className='justify-end'
            orientation='horizontal'
          >
            <form.AppForm>
              <form.SubmitButton pendingLabel={t('action.saving')}>
                {t('action.save')}
              </form.SubmitButton>
            </form.AppForm>
          </Field>
        </FieldGroup>
      </form>
    </EditSectionCard>
  )
}
