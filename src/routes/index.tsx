import { createFileRoute } from '@tanstack/react-router'
import { Trans, useTranslation } from 'react-i18next'

export const Route = createFileRoute('/')({
  component: Home,
  staticData: {
    titleKey: 'home',
    menuTitleKey: 'home',
    icon: 'i-tabler-home',
    order: 0,
    group: 'General',
  },
})

function Home() {
  const { t } = useTranslation()

  return (
    <div className='p-8'>
      <h1 className='text-4xl font-bold'>{t('home.welcome')}</h1>
      <span className='i-tabler-check'></span>
      <p className='mt-4 text-lg'>
        <Trans
          components={{ code: <code /> }}
          i18nKey='home.editHint'
          values={{ path: 'src/routes/index.tsx' }}
        />
      </p>
    </div>
  )
}
