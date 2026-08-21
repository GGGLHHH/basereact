import { Outlet } from '@tanstack/react-router'

import { Spinner } from '@/components/ui/spinner'

export function AdminPending() {
  return (
    <div className='flex min-h-svh items-center justify-center'>
      <Spinner className='size-6' />
    </div>
  )
}

// ponytail: 纯 Outlet 壳。有 auth 后在 beforeLoad 加登录态守卫。
export function AdminLayout() {
  return <Outlet />
}
