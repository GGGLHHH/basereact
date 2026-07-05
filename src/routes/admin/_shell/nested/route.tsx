import { Outlet, createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// 一级父路由:/admin/nested。route.tsx = 布局(标题 + Outlet 承载子路由),
// 同目录 index.tsx = 该路径自身的落地内容。菜单标题只挂在 route.tsx,
// index.tsx 不设 titleKey/menuTitle,免得面包屑/菜单出现同路径重复项。
export const Route = createFileRoute('/admin/_shell/nested')({
  component: NestedLayout,
  staticData: {
    titleKey: 'nested',
    menuTitleKey: 'nested',
    icon: 'i-tabler-stack-2',
    // 独立分组名与条目名区分开(否则 section "NESTED" 里又套一个 "Nested")。
    group: 'Demo',
    order: 3,
  },
})

function NestedLayout() {
  const { t } = useTranslation('route')
  return (
    <Card className='flex-1'>
      <CardHeader>
        <CardTitle>Level 1 · {t('nested')}</CardTitle>
        <CardDescription>Parent layout — renders &lt;Outlet /&gt; below.</CardDescription>
      </CardHeader>
      <CardContent>
        <Outlet />
      </CardContent>
    </Card>
  )
}
