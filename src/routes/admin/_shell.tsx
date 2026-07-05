import { Outlet, createFileRoute, useMatches } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { AppSidebar } from '@/components/app-sidebar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { requireAdmin } from '@/lib/route-guard'

// sidebar-07 壳:登录页在 _shell 之外,不吃侧边栏。
// 准入闸在 beforeLoad(admin 子树 ssr:false,只跑客户端):
// 渲染前拦截,me 进 context——本组件的 NavUser 就是消费者。
export const Route = createFileRoute('/admin/_shell')({
  // 匹配链(根到叶)的 accessPolicyKeys/anyOf 由守卫按目标 location 现算并
  // 一处判定。不消费 ctx.matches:类型经 Register 引整棵路由树,在本文件
  // 消费必 TS7022 自引用(细节见 route-guard.ts)。
  beforeLoad: ({ context, location }) => requireAdmin(context.queryClient, location),
  component: AdminShell,
})

// 面包屑吃最深一个带 titleKey 的路由,单级展示。
// ponytail: 有多级导航需求时再沿 matches 走完整层级。
function CurrentPageBreadcrumb() {
  const matches = useMatches()
  const { t } = useTranslation('route')
  const titleKey = [...matches].reverse().find((match) => match.staticData.titleKey)
    ?.staticData.titleKey

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbPage>{titleKey ? t(titleKey) : null}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}

function AdminShell() {
  const { me } = Route.useRouteContext()

  return (
    <SidebarProvider>
      <AppSidebar user={{ avatar: '', email: me.email ?? '', name: me.username }} />
      <SidebarInset>
        <header className='flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12'>
          <div className='flex items-center gap-2 px-4'>
            <SidebarTrigger className='-ml-1' />
            <Separator
              orientation='vertical'
              className='mr-2 data-[orientation=vertical]:h-4'
            />
            <CurrentPageBreadcrumb />
          </div>
        </header>
        <div className='flex flex-1 flex-col gap-4 p-4 pt-0'>
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
