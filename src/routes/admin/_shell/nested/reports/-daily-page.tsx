import { useTranslation } from 'react-i18next'

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function ReportsDaily() {
  const { t } = useTranslation()
  const { t: tr } = useTranslation('route')
  return (
    <Card size='sm'>
      <CardHeader>
        <CardTitle>{tr('titles.nestedDaily')}</CardTitle>
        <CardDescription>{t('nested.reports.dailyDescription')}</CardDescription>
      </CardHeader>
    </Card>
  )
}
