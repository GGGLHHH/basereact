import { useTranslation } from 'react-i18next'

// ponytail: 占位公开首页。任何人可见。
export function FrontendHomePage() {
  const { t } = useTranslation(['common', 'route'])

  return (
    <div className='flex flex-1 flex-col gap-4'>
      <h1 className='text-2xl font-semibold'>{t('route:titles.frontendHome')}</h1>
      <p className='text-sm text-muted-foreground'>{t('frontend.home.subtitle')}</p>
    </div>
  )
}
