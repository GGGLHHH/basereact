import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

// 一级父路由的落地内容:命中 /admin/nested 时渲染进 route.tsx 的 Outlet。
// 无 titleKey——面包屑/菜单用父 route.tsx 的,避免同路径重复。
export const Route = createFileRoute('/admin/_shell/nested/')({
  component: NestedIndex,
})

function NestedIndex() {
  const { t } = useTranslation()
  return <p className='text-sm text-muted-foreground'>{t('nested.landing')}</p>
}
