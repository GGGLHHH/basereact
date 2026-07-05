import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { ErrorState } from '@/components/error-state'

export const Route = createFileRoute('/admin/_shell/403')({
  component: ShellForbiddenPage,
  staticData: {
    titleKey: 'titles.forbidden',
  },
})

function ShellForbiddenPage() {
  const { t } = useTranslation()
  return (
    <ErrorState
      className='flex-1'
      homeTo='/admin/home'
      code='403'
      title={t('errors.forbidden.title')}
      description={t('errors.forbidden.description')}
    />
  )
}
