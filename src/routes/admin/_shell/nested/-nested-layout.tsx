import { Outlet } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function NestedLayout() {
  const { t } = useTranslation()
  const { t: tr } = useTranslation('route')
  return (
    <Card className='flex-1'>
      <CardHeader>
        <CardTitle>
          {t('nested.level1Prefix')}
          {tr('titles.nested')}
        </CardTitle>
        <CardDescription>{t('nested.parentLayoutDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Outlet />
      </CardContent>
    </Card>
  )
}
