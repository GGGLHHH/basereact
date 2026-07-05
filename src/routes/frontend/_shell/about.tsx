import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { Spinner } from '@/components/ui/spinner'
import { requireUser } from '@/lib/route-guard'

// 仅本页 ssr:false:守卫探针只跑客户端,免 SSR 的 cookie 转发——公开 home/login
// 保持 SSR,只有这张登录门后的页退成客户端渲染。beforeLoad 拦在渲染前,me 进
// context 供本组件消费(同 admin/_shell 的 NavUser 模式)。
export const Route = createFileRoute('/frontend/_shell/about')({
  ssr: false,
  beforeLoad: ({ context }) => requireUser(context.queryClient),
  component: AboutPage,
  pendingComponent: AboutPending,
  staticData: {
    titleKey: 'frontendAbout',
  },
})

function AboutPending() {
  return (
    <div className='flex flex-1 items-center justify-center'>
      <Spinner className='size-6' />
    </div>
  )
}

function AboutPage() {
  const { t } = useTranslation('route')
  const { me } = Route.useRouteContext()

  return (
    <div className='flex flex-1 flex-col gap-4'>
      <h1 className='text-2xl font-semibold'>{t('frontendAbout')}</h1>
      <p className='text-sm text-muted-foreground'>Signed in as {me.username}. Members only.</p>
    </div>
  )
}
