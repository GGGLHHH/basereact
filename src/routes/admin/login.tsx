import { createFileRoute } from '@tanstack/react-router'

import { LoginForm } from '@/components/login-form'
import { requireAdminGuest } from '@/lib/route-guard'

export const Route = createFileRoute('/admin/login')({
  // guest 闸:已是管理员直接去 /admin/home;探测失败一律放行(登录页必须可达)。
  beforeLoad: ({ context }) => requireAdminGuest(context.queryClient),
  component: LoginPage,
  staticData: {
    titleKey: 'adminLogin',
    accessPublic: true,
  },
})

function LoginPage() {
  return (
    <div className='flex min-h-svh w-full items-center justify-center p-6 md:p-10'>
      <div className='w-full max-w-sm'>
        <LoginForm />
      </div>
    </div>
  )
}
