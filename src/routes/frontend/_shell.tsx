import { useQuery } from '@tanstack/react-query'
import { Link, Outlet, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { meSoftQueryOptions, useLogout } from '@/api/auth'
import { Button } from '@/components/ui/button'

// pathless 布局:公开站顶部导航壳。无守卫——home 公开,about 自带 requireUser。
// 登录态走软探针(匿名 401 不触发刷新梯/重定向,公开访客不被弹走)。
export const Route = createFileRoute('/frontend/_shell')({
  component: FrontendShell,
})

function FrontendShell() {
  const { t } = useTranslation(['common', 'route'])
  const navigate = useNavigate()
  const { data: me } = useQuery(meSoftQueryOptions)
  const logout = useLogout()

  return (
    <div className='flex min-h-svh flex-col'>
      <header className='flex h-14 items-center gap-6 border-b px-6'>
        <nav className='flex items-center gap-4 text-sm'>
          <Link
            to='/frontend/home'
            className='[&.active]:font-semibold'
          >
            {t('route:frontendHome')}
          </Link>
          <Link
            to='/frontend/about'
            className='[&.active]:font-semibold'
          >
            {t('route:frontendAbout')}
          </Link>
        </nav>
        <div className='ml-auto flex items-center gap-3 text-sm'>
          {me ? (
            <>
              <span className='text-muted-foreground'>{me.username}</span>
              <Button
                variant='outline'
                size='sm'
                onClick={() =>
                  // 登出后离开可能已失权的当前页(如 about),回公开首页。
                  logout.mutate(undefined, {
                    onSuccess: () => void navigate({ to: '/frontend/home' }),
                  })
                }
              >
                {t('frontend.logout')}
              </Button>
            </>
          ) : (
            <Link
              to='/frontend/login'
              className='[&.active]:font-semibold'
            >
              {t('route:frontendLogin')}
            </Link>
          )}
        </div>
      </header>
      <main className='flex flex-1 flex-col p-6'>
        <Outlet />
      </main>
    </div>
  )
}
