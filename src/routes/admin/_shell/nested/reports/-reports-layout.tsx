import { Outlet } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function ReportsLayout() {
  const { t } = useTranslation()
  const { t: tr } = useTranslation('route')
  return (
    <Card className='flex-1'>
      <CardHeader>
        <CardTitle>
          {t('nested.reports.level2Prefix')}
          {tr('titles.nestedReports')}
        </CardTitle>
        <CardDescription>{t('nested.reports.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Outlet />
      </CardContent>
    </Card>
  )
}
