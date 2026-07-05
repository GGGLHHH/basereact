import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

// 二级父路由的落地内容:命中 /admin/nested/reports 时渲染。无 titleKey。
export const Route = createFileRoute('/admin/_shell/nested/reports/')({
  component: ReportsIndex,
})

function ReportsIndex() {
  const { t } = useTranslation()
  return <p className='text-sm text-muted-foreground'>{t('nested.reports.landing')}</p>
}
