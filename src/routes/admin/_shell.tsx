import { Fragment } from 'react'
import { Link, Outlet, createFileRoute, useMatches } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { AppSidebar } from '@/components/app-sidebar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
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

// 面包屑走完整匹配链:每个带 titleKey 的路由一级。中间级链到自身 fullPath
// (父路由都有 index 落地,含 /admin→重定向 home),末级是当前页不可点。
// flatMap 条件收集,titleKey 在生成对象里收窄为非空,免非空断言。
function CurrentPageBreadcrumb() {
  const matches = useMatches()
  const { t } = useTranslation('route')

  // match.fullPath 的联合含 index 路由的尾斜杠形态(/admin/、/admin/nested/),
  // 不在 Link 的 `to` 联合里;但带 titleKey 的都是 route.tsx/叶子(无尾斜杠),
  // 运行时恒可导航。谓词从匹配链实际值的 fullPath 联合(字面量,须取自 matches
  // 而非 typeof useMatches 的泛型默认 string)里 Exclude 掉尾斜杠形态,得 Link
  // 能吃的子集,把不变量交给编译器,免 as。
  type MatchPath = (typeof matches)[number]['fullPath']
  const isNavigablePath = (fullPath: MatchPath): fullPath is Exclude<MatchPath, `${string}/`> =>
    !fullPath.endsWith('/')

  const crumbs = matches.flatMap((match) =>
    match.staticData.titleKey
      ? [{ fullPath: match.fullPath, titleKey: match.staticData.titleKey }]
      : [],
  )

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1
          return (
            <Fragment key={crumb.fullPath}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{t(crumb.titleKey)}</BreadcrumbPage>
                ) : isNavigablePath(crumb.fullPath) ? (
                  <BreadcrumbLink render={<Link to={crumb.fullPath} />}>
                    {t(crumb.titleKey)}
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{t(crumb.titleKey)}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {isLast ? null : <BreadcrumbSeparator />}
            </Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

// 侧栏展开/收起持久化:SidebarProvider 切换时写 sidebar_state cookie,这里初始化读回。
// admin 子树 ssr:false,恒在客户端渲染,document 可用。
// ponytail: cookie 名对齐 ui/sidebar.tsx 的 SIDEBAR_COOKIE_NAME(未导出)。
function readSidebarOpen(): boolean {
  if (typeof document === 'undefined') {
    return true
  }
  const match = document.cookie.match(/(?:^|;\s*)sidebar_state=(true|false)/)
  return match ? match[1] === 'true' : true
}

function AdminShell() {
  const { me } = Route.useRouteContext()

  return (
    <SidebarProvider defaultOpen={readSidebarOpen()}>
      <AppSidebar user={{ avatar: '', email: me.email ?? '', name: me.username }} />
      <SidebarInset>
        <header className='flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12'>
          <div className='flex items-center gap-2 px-4'>
            <SidebarTrigger className='-ml-1' />
            <Separator
              orientation='vertical'
              className='mr-2 data-[orientation=vertical]:h-4 data-vertical:self-center'
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
