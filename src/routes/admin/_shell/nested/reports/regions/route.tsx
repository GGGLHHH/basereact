import { Outlet, createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// 三级父路由:/admin/nested/reports/regions。同样身兼两职——reports 的子,
// 又带 Outlet 承载自己的 index。菜单里它的子(index)无 menuTitle,故显示为叶子。
export const Route = createFileRoute('/admin/_shell/nested/reports/regions')({
  component: RegionsLayout,
  staticData: {
    titleKey: 'nestedRegions',
    menuTitleKey: 'nestedRegions',
    order: 1,
  },
})

function RegionsLayout() {
  const { t } = useTranslation('route')
  return (
    <Card className='flex-1'>
      <CardHeader>
        <CardTitle>Level 3 · {t('nestedRegions')}</CardTitle>
        <CardDescription>Parent layout — renders &lt;Outlet /&gt; below.</CardDescription>
      </CardHeader>
      <CardContent>
        <Outlet />
      </CardContent>
    </Card>
  )
}
