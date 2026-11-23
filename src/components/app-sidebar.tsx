'use client'

import type { TFunction } from 'i18next'
import type { AdminMenuEntry } from '@/lib/route-menu'

import { AudioLinesIcon, ChevronRightIcon, GalleryVerticalEndIcon, TerminalIcon } from '@gedatou/cadenza-icons'
import { Collapsible, CollapsiblePanel, CollapsibleTrigger, DropdownMenu, DropdownMenuItem, DropdownMenuPopup, DropdownMenuSeparator, DropdownMenuSubmenu, DropdownMenuSubmenuPopup, DropdownMenuSubmenuTrigger, DropdownMenuTrigger, Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, SidebarRail, useSidebar } from '@gedatou/cadenza-ui'
import { useQuery } from '@tanstack/react-query'

import { Link, useRouter, useRouterState } from '@tanstack/react-router'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { myPermissionsQueryOptions } from '@/api/auth'
import { PlayOnHover } from '@/components/icon-motion'
import { LanguageSwitcher } from '@/components/language-switcher'
import { NavUser } from '@/components/nav-user'
import { TeamSwitcher } from '@/components/team-switcher'
import { ThemeToggle } from '@/components/theme-toggle'

import { buildAdminMenu, pickActiveMenuUrl } from '@/lib/route-menu'
import { cn } from '@/lib/utils'

// This is sample data.
const data = {
  teams: [
    {
      name: 'Acme Inc',
      logo: <GalleryVerticalEndIcon />,
      plan: 'Enterprise',
    },
    {
      name: 'Acme Corp.',
      logo: <AudioLinesIcon />,
      plan: 'Startup',
    },
    {
      name: 'Evil Corp.',
      logo: <TerminalIcon />,
      plan: 'Free',
    },
  ],
}

// 路由 staticData.icon 给的动画图标。不单独挂触发:外层整行的 PlayOnHover 悬停时
// 一起播放(折叠箭头同理)。显式 size-4 shrink-0,收起(icon 模式)时不被压变形。
function MenuIcon({ icon: Icon }: { icon?: AdminMenuEntry['icon'] }) {
  return Icon ? <Icon className='size-4 shrink-0' /> : null
}

// 收起(icon)态下,有子项的顶层菜单点了没法展开——子菜单容器被 CSS 隐藏,点父行
// 只切了个不可见的 open。改走向右弹出的 DropdownMenu 飞出层:叶子=Link 直达,
// 含子=递归 DropdownMenuSubmenu,多级也能点到任意子页。飞出层用 vendored ui/dropdown-menu
// (块流,不加容器间距);项间缝由下面的 pill 内缩给。
//
// 飞出项高亮走内缩 ::before pill:pill 四周都内缩(inset-x-1 + inset-y-0.5),相邻两项的
// 高亮之间自带缝,故 hover 与激活不贴死——且**容器不加任何间距**(gap/space-y 对 Base UI
// 弹层脆:submenu 开合会增删父层子元素,容器间距随之抖动)。z-0 让 item 成层叠上下文,
// pill(-z-10)沉到文字下、popup 背景上。满盒 bg 用 ! 顶掉(与展开态 highlightProps 同一手法)。
const FLYOUT_PILL
  = 'z-0 before:absolute before:inset-x-1 before:inset-y-0.5 before:-z-10 before:rounded-sm before:content-[\'\']'
// 叶子/自身项:hover 画 accent pill(顶掉 focus:bg-accent 满盒)。
const FLYOUT_ITEM_CLASS = `${FLYOUT_PILL} focus:bg-transparent! focus:before:bg-accent`
// 有子项的 SubTrigger:另带 data-open / data-popup-open 满盒 bg,一并顶掉再画 pill。
const FLYOUT_TRIGGER_CLASS = `${FLYOUT_PILL} focus:bg-transparent! data-open:bg-transparent! data-popup-open:bg-transparent! focus:before:bg-accent data-open:before:bg-accent data-popup-open:before:bg-accent`
// 激活项:常驻 sidebar-accent pill + 前景色(与展开侧栏一致)。
const FLYOUT_ACTIVE_PILL = 'text-sidebar-accent-foreground before:bg-sidebar-accent'

function FlyoutMenuNode({
  node,
  pathname,
  t,
}: {
  node: AdminMenuEntry
  pathname: string
  t: TFunction<'route'>
}) {
  const label = node.labelKey ? t(node.labelKey) : node.label
  const isActive = pathname === node.url || pathname.startsWith(`${node.url}/`)
  if (node.children.length === 0) {
    return (
      <PlayOnHover>
        <DropdownMenuItem
          render={<Link to={node.url} />}
          className={cn(FLYOUT_ITEM_CLASS, isActive && FLYOUT_ACTIVE_PILL)}
        >
          <MenuIcon icon={node.icon} />
          <span className='group-data-[collapsible=icon]:sr-only'>{label}</span>
        </DropdownMenuItem>
      </PlayOnHover>
    )
  }
  return (
    <DropdownMenuSubmenu>
      <DropdownMenuSubmenuTrigger className={cn(FLYOUT_TRIGGER_CLASS, isActive && FLYOUT_ACTIVE_PILL)}>
        <MenuIcon icon={node.icon} />
        <span className='group-data-[collapsible=icon]:sr-only'>{label}</span>
      </DropdownMenuSubmenuTrigger>
      <DropdownMenuSubmenuPopup>
        {node.children.map(child => (
          <FlyoutMenuNode
            key={child.url}
            node={child}
            pathname={pathname}
            t={t}
          />
        ))}
      </DropdownMenuSubmenuPopup>
    </DropdownMenuSubmenu>
  )
}

// 递归渲染一个菜单节点。depth 0 用顶层 SidebarMenu 组件(带 tooltip,收起时
// 悬停显名),depth≥1 用 SidebarMenuSub 组件。有子项 = 可折叠(点父行展开,
// 不导航;落地页经面包屑或 URL 到达);叶子 = 直接是 Link。
function MenuNodeItem({
  node,
  depth,
  pathname,
  activeUrl,
  t,
}: {
  node: AdminMenuEntry
  depth: number
  pathname: string
  // 当前 pathname 命中的最深菜单项 url(pickActiveMenuUrl 一次算好,全树共用)。
  activeUrl: string | undefined
  t: TFunction<'route'>
}) {
  const label = node.labelKey ? t(node.labelKey) : node.label
  const isActive = pathname === node.url || pathname.startsWith(`${node.url}/`)
  const hasChildren = node.children.length > 0
  const { state, isMobile } = useSidebar()
  // 滑动高亮由 cadenza Sidebar 自带(整块面板共用一块底色,静止时停在 isActive 的按钮上),
  // 所以 isActive 只给「覆盖当前页的最深菜单项」(恰好一个)。不能用 startsWith 的 isActive:
  // 整条父链都会登记成激活,底色落到最上层父项。当前页不入菜单时(详情/建号)activeUrl
  // 回落到父路由,底色停在父项而非消失。父链上的祖先项只加粗,提示当前页在它下面。
  const isCurrent = node.url === activeUrl
  const highlightProps = {
    isActive: isCurrent,
    className: cn(isActive && !isCurrent && 'font-medium'),
  }

  // 折叠态受控:初始展开 = 命中当前路由;导航进入该分支时自动展开(只开不关,用户
  // 仍可手动折叠)。受控避免 defaultOpen 随路由变化触发 Base UI 的
  // "uncontrolled 组件初始化后又改 default" 告警。hooks 无条件在顶部,叶子分支不用。
  // 自动展开在渲染期比对上一次的 isActive 完成(React 官方的「props 变化时调整 state」),
  // 不放 effect:effect 里补 setOpen 会先提交一帧折叠态再纠正。
  const [open, setOpen] = React.useState(isActive)
  const [wasActive, setWasActive] = React.useState(isActive)
  if (wasActive !== isActive) {
    setWasActive(isActive)
    if (isActive) {
      setOpen(true)
    }
  }

  const childrenSub = hasChildren
    ? (
        <CollapsiblePanel>
          <SidebarMenuSub>
            {node.children.map(child => (
              <MenuNodeItem
                key={child.url}
                activeUrl={activeUrl}
                depth={depth + 1}
                node={child}
                pathname={pathname}
                t={t}
              />
            ))}
          </SidebarMenuSub>
        </CollapsiblePanel>
      )
    : null

  const chevron = (
    <ChevronRightIcon className='ml-auto transition-transform duration-200 group-data-open/collapsible:rotate-90' />
  )

  if (depth === 0) {
    if (!hasChildren) {
      return (
        <SidebarMenuItem>
          <PlayOnHover>
            <SidebarMenuButton
              tooltip={label}
              render={<Link to={node.url} />}
              {...highlightProps}
            >
              <MenuIcon icon={node.icon} />
              <span className='group-data-[collapsible=icon]:sr-only'>{label}</span>
            </SidebarMenuButton>
          </PlayOnHover>
        </SidebarMenuItem>
      )
    }
    // 收起态:折叠展开区被隐藏,改用飞出 DropdownMenu(顶项自身落地页 + 递归子项)。
    if (state === 'collapsed' && !isMobile) {
      return (
        <SidebarMenuItem>
          <DropdownMenu>
            {/* 收起态图标悬停即弹飞出层(openOnHover 是 Menu.Trigger 的 prop,点击仍可开);
                子层 SubmenuTrigger 默认 openOnHover,故多级也悬停展开。 */}
            <PlayOnHover>
              <DropdownMenuTrigger
                openOnHover
                render={(
                  <SidebarMenuButton
                    isActive={isActive}
                    tooltip={label}
                  />
                )}
              >
                <MenuIcon icon={node.icon} />
                <span className='group-data-[collapsible=icon]:sr-only'>{label}</span>
              </DropdownMenuTrigger>
            </PlayOnHover>
            <DropdownMenuPopup
              side='right'
              align='start'
              className='min-w-48'
            >
              <PlayOnHover>
                <DropdownMenuItem
                  render={<Link to={node.url} />}
                  className={cn(FLYOUT_ITEM_CLASS, pathname === node.url && FLYOUT_ACTIVE_PILL)}
                >
                  <MenuIcon icon={node.icon} />
                  <span className='group-data-[collapsible=icon]:sr-only'>{label}</span>
                </DropdownMenuItem>
              </PlayOnHover>
              <DropdownMenuSeparator />
              {node.children.map(child => (
                <FlyoutMenuNode
                  key={child.url}
                  node={child}
                  pathname={pathname}
                  t={t}
                />
              ))}
            </DropdownMenuPopup>
          </DropdownMenu>
        </SidebarMenuItem>
      )
    }
    return (
      <Collapsible
        className='group/collapsible'
        onOpenChange={setOpen}
        open={open}
        render={<SidebarMenuItem />}
      >
        <PlayOnHover>
          <CollapsibleTrigger
            render={(
              <SidebarMenuButton
                tooltip={label}
                {...highlightProps}
              />
            )}
          >
            <MenuIcon icon={node.icon} />
            <span className='group-data-[collapsible=icon]:sr-only'>{label}</span>
            {chevron}
          </CollapsibleTrigger>
        </PlayOnHover>
        {childrenSub}
      </Collapsible>
    )
  }

  if (!hasChildren) {
    return (
      <SidebarMenuSubItem>
        <PlayOnHover>
          <SidebarMenuSubButton
            render={<Link to={node.url} />}
            {...highlightProps}
          >
            <MenuIcon icon={node.icon} />
            <span className='group-data-[collapsible=icon]:sr-only'>{label}</span>
          </SidebarMenuSubButton>
        </PlayOnHover>
      </SidebarMenuSubItem>
    )
  }
  return (
    <Collapsible
      className='group/collapsible'
      onOpenChange={setOpen}
      open={open}
      render={<SidebarMenuSubItem />}
    >
      {/* SidebarMenuSubButton 默认渲染 <a>;作折叠触发器时强制成 <button>,
          否则 Base UI 报 "button 期望原生 <button>"(叶子仍用 Link 保持 <a>)。 */}
      <PlayOnHover>
        <CollapsibleTrigger
          render={(
            <SidebarMenuSubButton
              render={<button type='button' />}
              {...highlightProps}
            />
          )}
        >
          <MenuIcon icon={node.icon} />
          <span className='group-data-[collapsible=icon]:sr-only'>{label}</span>
          {chevron}
        </CollapsibleTrigger>
      </PlayOnHover>
      {childrenSub}
    </Collapsible>
  )
}

// 菜单数据来自路由树的 staticData(见 types/route.d.ts):
// menuTitleKey/menuTitle 决定入菜单,group 分组,order 排序,icon 是动画图标组件,
// fullPath 前缀决定嵌套层级。
function NavAdminRoutes() {
  const router = useRouter()
  const pathname = useRouterState({ select: state => state.location.pathname })
  const { t } = useTranslation('route')
  // 权限集与守卫共用一份缓存(同 queryKey);守卫若已按需取过则零请求。
  // 未加载时 permissions 为 [],声明了准入的条目 fail-closed 先隐藏。
  const { data: myPermissions } = useQuery(myPermissionsQueryOptions)
  const permissions = myPermissions?.permissions
  // spread:FileRoutesById 是 interface(无隐式索引签名),摊成对象字面量
  // 才能零 cast 匹配 Record<string, MenuSourceRoute>。
  // permissions 为 undefined 时落 buildAdminMenu 的 `= []` 默认参(fail-closed)。
  const groups = React.useMemo(
    () => buildAdminMenu({ ...router.routesById }, permissions),
    [router, permissions],
  )
  // 高亮目标 url:当前页入菜单则本身,否则回落到最近的入菜单祖先(见 pickActiveMenuUrl)。
  const activeUrl = pickActiveMenuUrl(groups, pathname)

  return (
    <>
      {groups.map(group => (
        <SidebarGroup key={group.labelKey}>
          <SidebarGroupLabel>{t(group.labelKey)}</SidebarGroupLabel>
          <SidebarMenu>
            {group.entries.map(entry => (
              <MenuNodeItem
                key={entry.url}
                activeUrl={activeUrl}
                depth={0}
                node={entry}
                pathname={pathname}
                t={t}
              />
            ))}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  )
}

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: { avatar: string, email: string, name: string }
}) {
  // 头/内容/底里的菜单按钮(含 TeamSwitcher / ThemeToggle 等 chrome 项)都是 cadenza 的
  // SidebarMenuButton,自动加入 Sidebar 自带的滑动高亮,不用再包高亮容器。
  return (
    <Sidebar
      collapsible='icon'
      {...props}
    >
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent className='scroll-fade-y'>
        <NavAdminRoutes />
      </SidebarContent>
      <SidebarFooter>
        <ThemeToggle />
        <LanguageSwitcher />
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
