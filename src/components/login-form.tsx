import { useNavigate } from '@tanstack/react-router'
import { useMemo, type ComponentProps } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import { useAdminLogin, useLogin } from '@/api/auth'
import { formSubmitHandler, useAppForm } from '@/components/form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldGroup } from '@/components/ui/field'
import { getErrorMessage } from '@/lib/api-client'
import { cn } from '@/lib/utils'

// surface 决定登录走哪个 surface 的端点与登录后落点。两个 hook 都无条件调用
// (rules-of-hooks),未选中的那个只是空闲 mutation,不发请求。
export function LoginForm({
  className,
  surface = 'admin',
  ...props
}: ComponentProps<'div'> & { surface?: 'admin' | 'frontend' }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const adminLogin = useAdminLogin()
  const userLogin = useLogin()
  const login = surface === 'admin' ? adminLogin : userLogin
  const redirectTo = surface === 'admin' ? '/admin/home' : '/frontend/home'
  const loginSchema = useMemo(
    () =>
      z.object({
        identifier: z.string().min(1, t('auth.login.identifierRequired')),
        password: z.string().min(1, t('auth.login.passwordRequired')),
      }),
    [t],
  )
  const form = useAppForm({
    defaultValues: {
      identifier: '',
      password: '',
    },
    validators: {
      onChange: loginSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        await login.mutateAsync(value)
      } catch (error) {
        toast.error(getErrorMessage(error))
        return
      }
      // ponytail: 登录后固定去 surface 首页;要"回跳来源页"时加 redirect search param。
      await navigate({ to: redirectTo })
    },
  })

  return (
    <div
      className={cn('flex flex-col gap-6', className)}
      {...props}
    >
      <Card>
        <CardHeader>
          <CardTitle>{t('auth.login.title')}</CardTitle>
          <CardDescription>{t('auth.login.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={formSubmitHandler(form.handleSubmit)}>
            <FieldGroup>
              <form.AppField name='identifier'>
                {(field) => (
                  <field.TextField
                    label={t('auth.login.identifierLabel')}
                    placeholder={t('auth.login.identifierPlaceholder')}
                    required
                  />
                )}
              </form.AppField>
              <form.AppField name='password'>
                {(field) => (
                  <field.PasswordField
                    label={t('auth.login.passwordLabel')}
                    required
                    labelEnd={
                      <a
                        href='#'
                        className='ml-auto inline-block text-sm underline-offset-4 hover:underline'
                      >
                        {t('auth.login.forgotPassword')}
                      </a>
                    }
                  />
                )}
              </form.AppField>
              <Field>
                <form.AppForm>
                  <form.SubmitButton pendingLabel={t('auth.login.submitting')}>
                    {t('auth.login.submit')}
                  </form.SubmitButton>
                </form.AppForm>
                <Button
                  variant='outline'
                  type='button'
                >
                  {t('auth.login.google')}
                </Button>
                <FieldDescription className='text-center'>
                  {t('auth.login.noAccount')} <a href='#'>{t('auth.login.signUp')}</a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
