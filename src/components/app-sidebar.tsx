'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useRouter, useRouterState } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { myPermissionsQueryOptions } from '@/api/auth'
import { NavUser } from '@/components/nav-user'
import { TeamSwitcher } from '@/components/team-switcher'
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
  SidebarRail,
} from '@/components/ui/sidebar'
import { buildAdminMenu } from '@/lib/route-menu'
import { cn } from '@/lib/utils'
import { IconLayoutRows, IconWaveSine, IconCommand } from '@tabler/icons-react'

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

// 菜单数据来自路由树的 staticData(见 types/route.d.ts):
// menuTitleKey/menuTitle 决定入菜单,group 分组,order 排序,icon 是 unocss 类。
function NavAdminRoutes() {
  const router = useRouter()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
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

  return (
    <>
      {groups.map((group) => (
        <SidebarGroup key={group.label}>
          <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
          <SidebarMenu>
            {group.entries.map((entry) => {
              const label = entry.labelKey ? t(entry.labelKey) : entry.label
              return (
                <SidebarMenuItem key={entry.url}>
                  <SidebarMenuButton
                    isActive={pathname === entry.url || pathname.startsWith(`${entry.url}/`)}
                    tooltip={label}
                    render={<Link to={entry.url} />}
                  >
                    {entry.icon ? (
                      // sidebar 的 [&_svg]:size-4/shrink-0 只保护 svg;unocss span
                      // 图标要自带尺寸和 shrink-0,否则收起(icon 模式)时被压变形。
                      <span
                        aria-hidden='true'
                        className={cn(entry.icon, 'size-4 shrink-0')}
                      />
                    ) : null}
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
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
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
