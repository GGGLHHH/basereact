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

// sidebar-07 壳:登录页在 _shell 之外,不吃侧边栏。
export const Route = createFileRoute('/admin/_shell')({
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
  return (
    <SidebarProvider>
      <AppSidebar />
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
