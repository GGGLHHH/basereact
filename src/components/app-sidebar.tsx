'use client'

import * as React from 'react'
import { Link, useRouter, useRouterState } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

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
  user: {
    name: 'shadcn',
    email: 'm@example.com',
    avatar: '/avatars/shadcn.jpg',
  },
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
  const groups = React.useMemo(() => buildAdminMenu(router.routeTree), [router])

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

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
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
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
