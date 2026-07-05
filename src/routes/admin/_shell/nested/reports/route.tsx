import { Outlet, createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// 二级父路由:/admin/nested/reports。对上是 nested 的子,对下带 Outlet 承载三级路由——
// "父路由"和"子路由"身份可叠加,这就是多级嵌套的核心。
export const Route = createFileRoute('/admin/_shell/nested/reports')({
  component: ReportsLayout,
  staticData: {
    titleKey: 'nestedReports',
    menuTitleKey: 'nestedReports',
    icon: 'i-tabler-chart-bar',
    order: 1,
  },
})

function ReportsLayout() {
  const { t } = useTranslation()
  const { t: tr } = useTranslation('route')
  return (
    <Card className='flex-1'>
      <CardHeader>
        <CardTitle>
          {t('nested.reports.level2Prefix')}
          {tr('nestedReports')}
        </CardTitle>
        <CardDescription>{t('nested.reports.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Outlet />
      </CardContent>
    </Card>
  )
}
