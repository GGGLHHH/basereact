import { useTranslation } from 'react-i18next'

export function NestedIndex() {
  const { t } = useTranslation()
  return <p className='text-sm text-muted-foreground'>{t('nested.landing')}</p>
}
