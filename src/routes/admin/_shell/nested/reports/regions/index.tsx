import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

// 三级父路由的落地内容:命中 /admin/nested/reports/regions 时渲染。无 titleKey。
export const Route = createFileRoute('/admin/_shell/nested/reports/regions/')({
  component: RegionsIndex,
})

function RegionsIndex() {
  const { t } = useTranslation()
  return <p className='text-sm text-muted-foreground'>{t('nested.reports.regions.landing')}</p>
}
