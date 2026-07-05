import { useNavigate } from '@tanstack/react-router'
import type { ComponentProps } from 'react'
import { z } from 'zod'

import { useAdminLogin } from '@/api/auth'
import { FieldError } from '@/components/field'
import { formSubmitHandler, useAppForm } from '@/components/form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldGroup } from '@/components/ui/field'
import { cn } from '@/lib/utils'

const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
})

export function LoginForm({ className, ...props }: ComponentProps<'div'>) {
  const navigate = useNavigate()
  // /admin/login 走 admin surface 的登录端点。
  const login = useAdminLogin()
  const form = useAppForm({
    defaultValues: {
      identifier: '',
      password: '',
    },
    validators: {
      onChange: loginSchema,
    },
    onSubmit: async ({ value }) => {
      await login.mutateAsync(value)
      // ponytail: 登录后固定回首页;要"回跳来源页"时加 redirect search param。
      await navigate({ to: '/' })
    },
  })

  return (
    <div
      className={cn('flex flex-col gap-6', className)}
      {...props}
    >
      <Card>
        <CardHeader>
          <CardTitle>Login to your account</CardTitle>
          <CardDescription>Enter your email below to login to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={formSubmitHandler(form.handleSubmit)}>
            <FieldGroup>
              <form.AppField name='identifier'>
                {(field) => (
                  <field.TextField
                    label='Email or username'
                    placeholder='m@example.com'
                    required
                  />
                )}
              </form.AppField>
              <form.AppField name='password'>
                {(field) => (
                  <field.PasswordField
                    label='Password'
                    required
                    labelEnd={
                      <a
                        href='#'
                        className='ml-auto inline-block text-sm underline-offset-4 hover:underline'
                      >
                        Forgot your password?
                      </a>
                    }
                  />
                )}
              </form.AppField>
              <Field>
                {login.isError ? <FieldError errors={[login.error]} /> : null}
                <form.AppForm>
                  <form.SubmitButton pendingLabel='Logging in...'>Login</form.SubmitButton>
                </form.AppForm>
                <Button
                  variant='outline'
                  type='button'
                >
                  Login with Google
                </Button>
                <FieldDescription className='text-center'>
                  Don&apos;t have an account? <a href='#'>Sign up</a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
