import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/admin/_shell/home')({
  component: AdminHomePage,
  staticData: {
    titleKey: 'adminHome',
    menuTitleKey: 'adminHome',
    icon: 'i-tabler-home',
    group: 'Admin',
    order: 0,
  },
})

// ponytail: 占位首页。有真实指标后换 widgetStats/myWidgetCount 卡片。
function AdminHomePage() {
  const { t } = useTranslation('route')

  return (
    <div className='flex flex-1 flex-col gap-4'>
      <h1 className='text-2xl font-semibold'>{t('adminHome')}</h1>
      <p className='text-sm text-muted-foreground'>Welcome to the admin console.</p>
    </div>
  )
}
