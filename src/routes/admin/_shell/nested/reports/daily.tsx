import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// 三级子路由(叶):/admin/nested/reports/daily。二级父路由 reports 下的页面。
export const Route = createFileRoute('/admin/_shell/nested/reports/daily')({
  component: ReportsDaily,
  staticData: {
    titleKey: 'titles.nestedDaily',
    menuTitleKey: 'titles.nestedDaily',
    order: 0,
  },
})

function ReportsDaily() {
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
