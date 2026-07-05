import { createFileRoute } from '@tanstack/react-router'

// 三级父路由的落地内容:命中 /admin/nested/reports/regions 时渲染。无 titleKey。
export const Route = createFileRoute('/admin/_shell/nested/reports/regions/')({
  component: RegionsIndex,
})

function RegionsIndex() {
  return (
    <p className='text-sm text-muted-foreground'>
      Regions landing (index). Deepest level in this demo.
    </p>
  )
}
