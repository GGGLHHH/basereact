import { createFileRoute } from '@tanstack/react-router'

import { requireUser } from '@/lib/route-guard'

import { FrontendNoTenantPage, NoTenantPending } from './-no-tenant-page'

// 「还没加入任何组织」(spec §4.2):登录后没有任何有效成员关系、也没有平台角色时的落点
// (见 api/auth.ts 的 frontendLandingAfterLogin),租户级接口回 tenant_required 时也来这里。
// 需登录,守卫同 about(只跑客户端)。
export const Route = createFileRoute('/frontend/_shell/no-tenant')({
  ssr: false,
  beforeLoad: ({ context }) => requireUser(context.queryClient),
  component: FrontendNoTenantPage,
  pendingComponent: NoTenantPending,
  staticData: {
    titleKey: 'titles.noTenant',
  },
})
