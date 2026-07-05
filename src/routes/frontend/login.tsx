import { createFileRoute } from '@tanstack/react-router'

import { LoginForm } from '@/components/login-form'
import { requireUserGuest } from '@/lib/route-guard'

// guest 闸:本 tab 已登录直接去 /frontend/home;冷缓存/匿名放行(登录页纯缓存判断,
// 零网络,可保持 SSR)。在 _shell 之外,不吃顶部导航——独立居中表单。
export const Route = createFileRoute('/frontend/login')({
  beforeLoad: ({ context }) => requireUserGuest(context.queryClient),
  component: LoginPage,
  staticData: {
    titleKey: 'frontendLogin',
    accessPublic: true,
  },
})

function LoginPage() {
  return (
    <div className='flex min-h-svh w-full items-center justify-center p-6 md:p-10'>
      <div className='w-full max-w-sm'>
        <LoginForm surface='frontend' />
      </div>
    </div>
  )
}
