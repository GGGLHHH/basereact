import { getRouteApi } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { Spinner } from '@/components/ui/spinner'

// 组件在非路由文件里,拿不到同文件的 Route:改用同 id 的 RouteApi 取 context,
// 类型与守卫注入的 me 完全一致。
const route = getRouteApi('/frontend/_shell/about')

export function AboutPending() {
  return (
    <div className='flex flex-1 items-center justify-center'>
      <Spinner className='size-6' />
    </div>
  )
}

export function AboutPage() {
  const { t } = useTranslation()
  const { t: tr } = useTranslation('route')
  const { me } = route.useRouteContext()

  return (
    <div className='flex flex-1 flex-col gap-4'>
      <h1 className='text-2xl font-semibold'>{tr('titles.frontendAbout')}</h1>
      <p className='text-sm text-muted-foreground'>
        {t('frontend.about.signedIn', { username: me.username })}
      </p>
    </div>
  )
}
