import { useTranslation } from 'react-i18next'

export function ReportsIndex() {
  const { t } = useTranslation()
  return <p className='text-sm text-muted-foreground'>{t('nested.reports.landing')}</p>
}
