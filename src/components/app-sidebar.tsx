'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useRouter, useRouterState } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { myPermissionsQueryOptions } from '@/api/auth'
import { LanguageSwitcher } from '@/components/language-switcher'
import { NavUser } from '@/components/nav-user'
import { SidebarNavHighlight } from '@/components/sidebar-nav-highlight'
import { TeamSwitcher } from '@/components/team-switcher'
import { ThemeToggle } from '@/components/theme-toggle'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import { buildAdminMenu } from '@/lib/route-menu'
import { cn } from '@/lib/utils'
import { IconChevronRight, IconLayoutRows, IconWaveSine, IconCommand } from '@tabler/icons-react'

import type { TFunction } from 'i18next'
import type { AdminMenuEntry } from '@/lib/route-menu'

// This is sample data.
const data = {
  teams: [
    {
      name: 'Acme Inc',
      logo: <IconLayoutRows />,
      plan: 'Enterprise',
    },
    {
      name: 'Acme Corp.',
      logo: <IconWaveSine />,
      plan: 'Startup',
    },
    {
      name: 'Evil Corp.',
      logo: <IconCommand />,
      plan: 'Free',
    },
  ],
}

// sidebar 的 [&_svg]:size-4/shrink-0 只保护 svg;unocss span 图标要自带尺寸和
// shrink-0,否则收起(icon 模式)时被压变形。
function MenuIcon({ icon }: { icon?: string }) {
  if (!icon) {
    return null
  }
  return (
    <span
      aria-hidden='true'
      className={cn(icon, 'size-4 shrink-0')}
    />
  )
}

// 收起(icon)态下,有子项的顶层菜单点了没法展开——子菜单容器被 CSS 隐藏,点父行
// 只切了个不可见的 open。改走向右弹出的 DropdownMenu 飞出层:叶子=Link 直达,
// 含子=递归 DropdownMenuSub,多级也能点到任意子页。
// 激活态用与展开侧栏一致的 sidebar-accent(SidebarMenuButton 的 data-active 同款)。
const FLYOUT_ACTIVE_CLASS = 'bg-sidebar-accent text-sidebar-accent-foreground'

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
      <DropdownMenuItem
        render={<Link to={node.url} />}
        className={cn(isActive && FLYOUT_ACTIVE_CLASS)}
      >
        <MenuIcon icon={node.icon} />
        <span className='group-data-[collapsible=icon]:sr-only'>{label}</span>
      </DropdownMenuItem>
    )
  }
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className={cn(isActive && FLYOUT_ACTIVE_CLASS)}>
        <MenuIcon icon={node.icon} />
        <span className='group-data-[collapsible=icon]:sr-only'>{label}</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        {node.children.map((child) => (
          <FlyoutMenuNode
            key={child.url}
            node={child}
            pathname={pathname}
            t={t}
          />
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}

// 递归渲染一个菜单节点。depth 0 用顶层 SidebarMenu 组件(带 tooltip,收起时
// 悬停显名),depth≥1 用 SidebarMenuSub 组件。有子项 = 可折叠(点父行展开,
// 不导航;落地页经面包屑或 URL 到达);叶子 = 直接是 Link。
function MenuNodeItem({
  node,
  depth,
  pathname,
  t,
}: {
  node: AdminMenuEntry
  depth: number
  pathname: string
  t: TFunction<'route'>
}) {
  const label = node.labelKey ? t(node.labelKey) : node.label
  const isActive = pathname === node.url || pathname.startsWith(`${node.url}/`)
  const hasChildren = node.children.length > 0
  const { state, isMobile } = useSidebar()
  // 展开态才走滑动高亮:标记可 hover 项 + 激活项,并抹掉按钮自身 hover/active 背景
  // (背景交给滑动 pill,见 SidebarNavHighlight)。收起态用飞出,不需要。
  const highlight = state === 'expanded'
  // pill 目标 = 当前页那一项(精确匹配)。用 isActive(startsWith)会把整条父链都标上
  // data-nav-active,querySelector 取到最上层父项,离开菜单时 pill 就回不到子项。
  const isCurrent = pathname === node.url
  const highlightProps = {
    'data-nav-item': highlight ? '' : undefined,
    'data-nav-active': highlight && isCurrent ? 'true' : undefined,
    className: cn(highlight && 'hover:bg-transparent! data-active:bg-transparent!'),
  }

  // 折叠态受控:初始展开 = 命中当前路由;导航进入该分支时自动展开(effect 只开不
  // 关,用户仍可手动折叠)。受控避免 defaultOpen 随路由变化触发 Base UI 的
  // "uncontrolled 组件初始化后又改 default" 告警。hooks 无条件在顶部,叶子分支不用。
  const [open, setOpen] = React.useState(isActive)
  React.useEffect(() => {
    if (isActive) {
      setOpen(true)
    }
  }, [isActive])

  const childrenSub = hasChildren ? (
    <CollapsibleContent>
      <SidebarMenuSub>
        {node.children.map((child) => (
          <MenuNodeItem
            key={child.url}
            depth={depth + 1}
            node={child}
            pathname={pathname}
            t={t}
          />
        ))}
      </SidebarMenuSub>
    </CollapsibleContent>
  ) : null

  const chevron = (
    <IconChevronRight className='ml-auto transition-transform duration-200 group-data-open/collapsible:rotate-90' />
  )

  if (depth === 0) {
    if (!hasChildren) {
      return (
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={isActive}
            tooltip={label}
            render={<Link to={node.url} />}
            {...highlightProps}
          >
            <MenuIcon icon={node.icon} />
            <span className='group-data-[collapsible=icon]:sr-only'>{label}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      )
    }
    // 收起态:折叠展开区被隐藏,改用飞出 DropdownMenu(顶项自身落地页 + 递归子项)。
    if (state === 'collapsed' && !isMobile) {
      return (
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <SidebarMenuButton
                  isActive={isActive}
                  tooltip={label}
                />
              }
            >
              <MenuIcon icon={node.icon} />
              <span className='group-data-[collapsible=icon]:sr-only'>{label}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side='right'
              align='start'
              className='min-w-48'
            >
              <DropdownMenuItem
                render={<Link to={node.url} />}
                className={cn(pathname === node.url && FLYOUT_ACTIVE_CLASS)}
              >
                <MenuIcon icon={node.icon} />
                <span className='group-data-[collapsible=icon]:sr-only'>{label}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {node.children.map((child) => (
                <FlyoutMenuNode
                  key={child.url}
                  node={child}
                  pathname={pathname}
                  t={t}
                />
              ))}
            </DropdownMenuContent>
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
        <CollapsibleTrigger
          render={
            <SidebarMenuButton
              isActive={isActive}
              tooltip={label}
              {...highlightProps}
            />
          }
        >
          <MenuIcon icon={node.icon} />
          <span className='group-data-[collapsible=icon]:sr-only'>{label}</span>
          {chevron}
        </CollapsibleTrigger>
        {childrenSub}
      </Collapsible>
    )
  }

  if (!hasChildren) {
    return (
      <SidebarMenuSubItem>
        <SidebarMenuSubButton
          isActive={isActive}
          render={<Link to={node.url} />}
          {...highlightProps}
        >
          <MenuIcon icon={node.icon} />
          <span className='group-data-[collapsible=icon]:sr-only'>{label}</span>
        </SidebarMenuSubButton>
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
      <CollapsibleTrigger
        render={
          <SidebarMenuSubButton
            isActive={isActive}
            render={<button type='button' />}
            {...highlightProps}
          />
        }
      >
        <MenuIcon icon={node.icon} />
        <span className='group-data-[collapsible=icon]:sr-only'>{label}</span>
        {chevron}
      </CollapsibleTrigger>
      {childrenSub}
    </Collapsible>
  )
}

// 菜单数据来自路由树的 staticData(见 types/route.d.ts):
// menuTitleKey/menuTitle 决定入菜单,group 分组,order 排序,icon 是 unocss 类,
// fullPath 前缀决定嵌套层级。
function NavAdminRoutes() {
  const router = useRouter()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const { t } = useTranslation('route')
  const { state } = useSidebar()
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

  return (
    <SidebarNavHighlight
      enabled={state === 'expanded'}
      activeKey={pathname}
    >
      {groups.map((group) => (
        <SidebarGroup key={group.label}>
          <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
          <SidebarMenu>
            {group.entries.map((entry) => (
              <MenuNodeItem
                key={entry.url}
                depth={0}
                node={entry}
                pathname={pathname}
                t={t}
              />
            ))}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </SidebarNavHighlight>
  )
}

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: { avatar: string; email: string; name: string }
}) {
  return (
    <Sidebar
      collapsible='icon'
      {...props}
    >
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
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
