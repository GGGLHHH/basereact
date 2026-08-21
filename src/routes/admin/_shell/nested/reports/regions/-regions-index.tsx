import { useTranslation } from 'react-i18next'

export function RegionsIndex() {
  const { t } = useTranslation()
  return <p className='text-sm text-muted-foreground'>{t('nested.reports.regions.landing')}</p>
}
