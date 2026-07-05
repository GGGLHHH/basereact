import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { ErrorState } from '@/components/error-state'

export const Route = createFileRoute('/admin/_shell/404')({
  component: ShellNotFoundPage,
  staticData: {
    titleKey: 'titles.notFound',
  },
})

function ShellNotFoundPage() {
  const { t } = useTranslation()
  return (
    <ErrorState
      className='flex-1'
      homeTo='/admin/home'
      code='404'
      title={t('errors.notFound.title')}
      description={t('errors.notFound.description')}
    />
  )
}
