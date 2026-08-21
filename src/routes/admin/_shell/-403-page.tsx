import { useTranslation } from 'react-i18next'

import { ErrorState } from '@/components/error-state'

export function ShellForbiddenPage() {
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
