import { createFileRoute } from '@tanstack/react-router'

// 二级父路由的落地内容:命中 /admin/nested/reports 时渲染。无 titleKey。
export const Route = createFileRoute('/admin/_shell/nested/reports/')({
  component: ReportsIndex,
})

function ReportsIndex() {
  return (
    <p className='text-sm text-muted-foreground'>
      Reports landing (index). Pick Daily or Regions from the sidebar.
    </p>
  )
}
