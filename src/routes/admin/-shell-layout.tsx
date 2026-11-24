import type { TFunction } from 'i18next'
import type { ReactNode } from 'react'
import type { AdminMenuEntry } from '@/lib/route-menu'
import { ChevronDownIcon } from '@gedatou/cadenza-icons'
import { DropdownMenu, DropdownMenuPopup, DropdownMenuTrigger, ScrollArea, SidebarInset, SidebarProvider, SidebarTrigger } from '@gedatou/cadenza-ui'
import { getRouteApi, Link, Outlet, useMatches, useRouterState } from '@tanstack/react-router'
import { Fragment } from 'react'

import { useTranslation } from 'react-i18next'
import { AppSidebar } from '@/components/app-sidebar'
import { PlayOnHover } from '@/components/icon-motion'
import { FlyoutMenuNode } from '@/components/menu-flyout'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import { findMenuEntry } from '@/lib/route-menu'
import { ADMIN_SCROLL_ID } from '@/lib/scroll-ids'
import { useAdminMenu } from '@/lib/use-admin-menu'
import { cn } from '@/lib/utils'

// 组件与路由定义分文件:路由文件只导出 Route(单一导出才吃得到代码分割 / fast refresh),
// 组件这边按 id 取路由 API,免回头 import Route 造成循环依赖。
const routeApi = getRouteApi('/admin/_shell')

// 面包屑走完整匹配链:每个带 titleKey 的路由一级。中间级链到自身 fullPath
// (有自己页面的父路由,含 /admin→重定向 home);纯分组(staticData.isGroup,
// 没有自己的页面)是纯文字;末级是当前页不可点。
// flatMap 条件收集,titleKey 在生成对象里收窄为非空,免非空断言。
// 图标与侧栏同一个(staticData.icon):可点的中间级悬停时播放,末级当前页进入时播一遍。
const CRUMB_CLASS = 'inline-flex items-center gap-1.5'
const CRUMB_ICON_CLASS = 'size-3.5 shrink-0'

// 纯分组那一级:悬停(点击、键盘也行)展开它的子菜单,和侧栏收起态的飞出层同一套
// 渲染(FlyoutMenuNode)。菜单里找不到它(权限还没加载 / 被裁掉)时退回不可点的文字,
// 带 data-disabled 吃 cadenza 统一的禁用光标。
function GroupCrumb({
  entry,
  label,
  pathname,
  t,
}: {
  entry: AdminMenuEntry | undefined
  label: ReactNode
  pathname: string
  t: TFunction<'route'>
}) {
  if (!entry || entry.children.length === 0) {
    return (
      <span
        className={CRUMB_CLASS}
        data-disabled
      >
        {label}
      </span>
    )
  }
  return (
    <DropdownMenu>
      <PlayOnHover>
        <DropdownMenuTrigger
          openOnHover
          className={cn(CRUMB_CLASS, 'group/crumb cursor-pointer rounded-sm transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:text-foreground')}
        >
          {label}
          <ChevronDownIcon className='size-3 transition-transform group-data-popup-open/crumb:rotate-180' />
        </DropdownMenuTrigger>
      </PlayOnHover>
      <DropdownMenuPopup
        align='start'
        className='min-w-40'
      >
        {entry.children.map(child => (
          <FlyoutMenuNode
            key={child.url}
            node={child}
            pathname={pathname}
            t={t}
          />
        ))}
      </DropdownMenuPopup>
    </DropdownMenu>
  )
}

function CurrentPageBreadcrumb() {
  const matches = useMatches()
  const { t } = useTranslation('route')
  const menu = useAdminMenu()
  const pathname = useRouterState({ select: state => state.location.pathname })

  // match.fullPath 的联合含 index 路由的尾斜杠形态(/admin/、/admin/nested/),
  // 不在 Link 的 `to` 联合里;但带 titleKey 的都是 route.tsx/叶子(无尾斜杠),
  // 运行时恒可导航。谓词从匹配链实际值的 fullPath 联合(字面量,须取自 matches
  // 而非 typeof useMatches 的泛型默认 string)里 Exclude 掉尾斜杠形态,得 Link
  // 能吃的子集,把不变量交给编译器,免 as。
  type MatchPath = (typeof matches)[number]['fullPath']
  const isNavigablePath = (fullPath: MatchPath): fullPath is Exclude<MatchPath, `${string}/`> =>
    !fullPath.endsWith('/')

  const crumbs = matches.flatMap(match =>
    match.staticData.titleKey
      ? [{
          fullPath: match.fullPath,
          icon: match.staticData.icon,
          isGroup: match.staticData.isGroup === true,
          titleKey: match.staticData.titleKey,
        }]
      : [],
  )

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1
          const Icon = crumb.icon
          const label = (
            <>
              {Icon
                ? (
                    <Icon
                      animateOnView={isLast}
                      className={CRUMB_ICON_CLASS}
                    />
                  )
                : null}
              {t(crumb.titleKey)}
            </>
          )
          return (
            <Fragment key={crumb.fullPath}>
              <BreadcrumbItem>
                {isLast
                  ? <BreadcrumbPage className={CRUMB_CLASS}>{label}</BreadcrumbPage>
                  : !crumb.isGroup && isNavigablePath(crumb.fullPath)
                      ? (
                          <PlayOnHover>
                            <BreadcrumbLink
                              className={CRUMB_CLASS}
                              // exact:否则当前页在它下面时 Link 判为激活,给祖先级挂上
                              // aria-current="page"(当前页只有末级那个)。
                              render={(
                                <Link
                                  activeOptions={{ exact: true }}
                                  to={crumb.fullPath}
                                />
                              )}
                            >
                              {label}
                            </BreadcrumbLink>
                          </PlayOnHover>
                        )
                      // 纯分组:悬停展开它的子菜单(见 GroupCrumb)。
                      : (
                          <GroupCrumb
                            entry={findMenuEntry(menu, crumb.fullPath)}
                            label={label}
                            pathname={pathname}
                            t={t}
                          />
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
// ponytail: cookie 名对齐 cadenza SidebarProvider 写的 sidebar_state(它只写不读,读回是应用的事)。
function readSidebarOpen(): boolean {
  if (typeof document === 'undefined') {
    return true
  }
  const match = document.cookie.match(/(?:^|;\s*)sidebar_state=(true|false)/)
  return match ? match[1] === 'true' : true
}

export function AdminShell() {
  const { me } = routeApi.useRouteContext()

  return (
    // 整壳锁在一屏高(h-svh):页面内容在下面的 ScrollArea 里滚,用组件库的滚动条,不出浏览器原生滚动条。
    <SidebarProvider
      defaultOpen={readSidebarOpen()}
      className='h-svh'
    >
      <AppSidebar
        variant='inset'
        user={{ avatar: '', email: me.email ?? '', name: me.username }}
      />
      {/* min-w-0:让 inset(sidebar 的 flex peer)能缩到 flex 轨道以下,宽表(如 users 8 列)
          转表格内部横滚,而非撑出页面级横滚。cadenza 的 SidebarInset 没带 min-w-0,在调用方补。 */}
      <SidebarInset className='min-h-0 min-w-0 overflow-hidden'>
        <header className='flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12'>
          <div className='flex items-center gap-2 px-4'>
            <SidebarTrigger className='-ml-1' />
            <Separator
              orientation='vertical'
              className='mr-2 data-[orientation=vertical]:h-4 data-vertical:self-center'
            />
            <CurrentPageBreadcrumb />
          </div>
        </header>
        {/* 滚动位置随路由:data-scroll-restoration-id 让 TanStack Router 按历史记录还原,
            新导航回顶靠 router 的 scrollToTopSelectors(见 router.tsx)。 */}
        <ScrollArea
          className='min-h-0 flex-1'
          viewportRender={<div data-scroll-restoration-id={ADMIN_SCROLL_ID} />}
        >
          <div className='flex min-h-full flex-col gap-4 p-4'>
            <Outlet />
          </div>
        </ScrollArea>
      </SidebarInset>
    </SidebarProvider>
  )
}
