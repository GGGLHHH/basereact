import { createFileRoute } from '@tanstack/react-router'

import { TeamPage } from '@/business/tenant/team-page'
import { Spinner } from '@/components/ui/spinner'
import { requireUser } from '@/lib/route-guard'

// 团队(租户内成员管理,tn:admin 自助)。守卫只要登录 —— 「是不是本租户 admin」由
// 后端的活 tn:admin 检查裁决(非 admin → 页面显示「你不是管理员」),不在前端门控。
// 同 about.tsx:登录门后的页 ssr:false(守卫探针只跑客户端)。
export const Route = createFileRoute('/frontend/_shell/team')({
  ssr: false,
  beforeLoad: ({ context }) => requireUser(context.queryClient),
  component: TeamPage,
  pendingComponent: TeamPending,
  staticData: {
    titleKey: 'titles.frontendTeam',
  },
})

function TeamPending() {
  return (
    <div className='flex flex-1 items-center justify-center'>
      <Spinner className='size-6' />
    </div>
  )
}
