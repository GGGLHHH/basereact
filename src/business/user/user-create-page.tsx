import { useNavigate, useRouter } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import type { RoleView } from '#/generated/api-types'

import { useCreateUser } from '@/api/users'
import { RoleInfiniteSelect } from '@/business/role/select/role-infinite-select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/field'
import { formSubmitHandler, useAppForm } from '@/components/form'
import { getErrorMessage } from '@/lib/api-client'

export function UserCreatePage() {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const router = useRouter()
  const create = useCreateUser()

  // 角色改由 RoleInfiniteSelect 从目录选,提交角色 id(uuid)。onChange 同时给 items 供展示。
  const [roleIds, setRoleIds] = useState<string[]>([])
  const [roleItems, setRoleItems] = useState<RoleView[]>([])

  const schema = useMemo(
    () =>
      z.object({
        email: z.string(),
        password: z.string().min(3, t('users.validation.passwordMin')),
        // refine 判 trim 后非空:纯空格也拦(提交走 trim,校验同口径)。不用 .trim()
        // transform——那会改写字段值,和 TanStack Form 的 onChange 校验相互干扰。
        username: z
          .string()
          .refine((value) => value.trim().length > 0, t('users.validation.usernameRequired')),
      }),
    [t],
  )

  const form = useAppForm({
    defaultValues: { email: '', password: '', username: '' },
    validators: { onChange: schema },
    onSubmit: async ({ value }) => {
      try {
        await create.mutateAsync({
          email: value.email.trim() || null,
          password: value.password,
          roles: roleIds,
          username: value.username.trim(),
        })
      } catch (error) {
        toast.error(getErrorMessage(error))
        return
      }
      toast.success(t('users.create.success'))
      await navigate({ to: '/admin/users' })
    },
  })

  return (
    <Card className='mx-auto w-full max-w-2xl'>
      <CardHeader>
        <CardTitle>{t('users.create.title')}</CardTitle>
        <CardDescription>{t('users.create.description')}</CardDescription>
      </CardHeader>
      <CardContent>
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
            <form.AppField name='password'>
              {(field) => (
                <field.PasswordField
                  label={t('users.form.password')}
                  placeholder={t('users.form.passwordPlaceholder')}
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
            <Field>
              <FieldLabel>{t('users.columns.roles')}</FieldLabel>
              <RoleInfiniteSelect
                multiple
                onChange={(items, ids) => {
                  setRoleItems(items)
                  setRoleIds(ids)
                }}
                value={roleIds}
              >
                <Button
                  className='h-auto min-h-9 w-full justify-between'
                  type='button'
                  variant='outline'
                >
                  <span className='flex flex-1 flex-wrap items-center gap-1'>
                    {roleIds.length === 0 ? (
                      <span className='text-muted-foreground'>
                        {t('users.form.rolesPlaceholder')}
                      </span>
                    ) : (
                      roleItems.map((role) => (
                        <Badge
                          key={role.id}
                          variant='secondary'
                        >
                          {role.display_name || role.name}
                        </Badge>
                      ))
                    )}
                  </span>
                  <span className='i-lucide-chevron-down size-4 shrink-0 opacity-50' />
                </Button>
              </RoleInfiniteSelect>
            </Field>
            <Field
              className='justify-end'
              orientation='horizontal'
            >
              <Button
                onClick={() => router.history.back()}
                type='button'
                variant='outline'
              >
                {t('action.cancel')}
              </Button>
              <form.AppForm>
                <form.SubmitButton pendingLabel={t('action.saving')}>
                  {t('users.create.submit')}
                </form.SubmitButton>
              </form.AppForm>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
