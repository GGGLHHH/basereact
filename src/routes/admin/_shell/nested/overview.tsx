import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// 二级子路由(叶):/admin/nested/overview。一级父路由下的普通页面。
export const Route = createFileRoute('/admin/_shell/nested/overview')({
  component: NestedOverview,
  staticData: {
    titleKey: 'nestedOverview',
    menuTitleKey: 'nestedOverview',
    order: 0,
  },
})

function NestedOverview() {
  const { t } = useTranslation('route')
  return (
    <Card size='sm'>
      <CardHeader>
        <CardTitle>{t('nestedOverview')}</CardTitle>
        <CardDescription>Level 2 · leaf under Nested.</CardDescription>
      </CardHeader>
    </Card>
  )
}
