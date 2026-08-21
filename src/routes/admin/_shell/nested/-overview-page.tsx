import { useTranslation } from 'react-i18next'

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function NestedOverview() {
  const { t } = useTranslation()
  const { t: tr } = useTranslation('route')
  return (
    <Card size='sm'>
      <CardHeader>
        <CardTitle>{tr('titles.nestedOverview')}</CardTitle>
        <CardDescription>{t('nested.overviewDescription')}</CardDescription>
      </CardHeader>
    </Card>
  )
}
