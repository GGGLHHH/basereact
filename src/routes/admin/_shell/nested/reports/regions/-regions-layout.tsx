import { Outlet } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function RegionsLayout() {
  const { t } = useTranslation()
  const { t: tr } = useTranslation('route')
  return (
    <Card className='flex-1'>
      <CardHeader>
        <CardTitle>
          {t('nested.reports.regions.level3Prefix')}
          {tr('titles.nestedRegions')}
        </CardTitle>
        <CardDescription>{t('nested.reports.regions.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Outlet />
      </CardContent>
    </Card>
  )
}
