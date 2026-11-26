import type { ComponentProps } from 'react'
import type { UserResponse } from '@/generated/api-types'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import { frontendLandingAfterLogin, useAdminLogin, useLogin } from '@/api/auth'
import { Field, FieldGroup } from '@/components/field'
import { formProps, useAppForm } from '@/components/form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  const queryClient = useQueryClient()
  const adminLogin = useAdminLogin()
  const userLogin = useLogin()
  const login = surface === 'admin' ? adminLogin : userLogin
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
      let user: UserResponse
      try {
        user = await login.mutateAsync(value)
      }
      catch (error) {
        toast.error(getErrorMessage(error))
        return
      }
      // 后台:固定去首页,没加入任何组织由守卫(403 tenant_required)转空状态页。
      // 公开站:没有成员关系也没有平台角色 → 直接去「还没加入任何组织」(spec §4.2)。
      // ponytail: 要"回跳来源页"时加 redirect search param。
      const redirectTo = surface === 'admin'
        ? '/admin/home'
        : await frontendLandingAfterLogin(queryClient, user)
      // 同 user-create-page:cadenza-form 的提交管线不 catch,导航失败
      // 会逃逸成无处理的 promise rejection —— 在这里收口。
      await navigate({ to: redirectTo }).catch((error: unknown) => {
        console.error(error)
      })
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
          <form {...formProps(form)}>
            <FieldGroup>
              <form.AppField name='identifier'>
                {field => (
                  <field.TextField
                    label={t('auth.login.identifierLabel')}
                    placeholder={t('auth.login.identifierPlaceholder')}
                    required
                  />
                )}
              </form.AppField>
              <form.AppField name='password'>
                {field => (
                  <field.PasswordField
                    label={t('auth.login.passwordLabel')}
                    required
                    labelEnd={(
                      <a
                        href='#'
                        className='ml-auto inline-block text-sm underline-offset-4 hover:underline'
                      >
                        {t('auth.login.forgotPassword')}
                      </a>
                    )}
                  />
                )}
              </form.AppField>
              <Field>
                <form.AppForm>
                  <form.SubmitButton pendingLabel={t('auth.login.submitting')}>
                    {t('auth.login.submit')}
                  </form.SubmitButton>
                </form.AppForm>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
