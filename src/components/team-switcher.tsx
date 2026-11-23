'use client'

import { ChevronUpDownIcon, PlusIcon } from '@gedatou/cadenza-icons'

import { DropdownMenu, DropdownMenuGroup, DropdownMenuGroupLabel, DropdownMenuItem, DropdownMenuPopup, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuTrigger, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@gedatou/cadenza-ui'
import * as React from 'react'

import { useTranslation } from 'react-i18next'
import { PlayOnHover } from '@/components/icon-motion'

export function TeamSwitcher({
  teams,
}: {
  teams: {
    name: string
    logo: React.ReactNode
    plan: string
  }[]
}) {
  const { t } = useTranslation()
  const { isMobile } = useSidebar()
  // teams 可能是空数组(索引访问的类型不体现这点),state 显式带上 undefined。
  const [activeTeam, setActiveTeam] = React.useState<(typeof teams)[number] | undefined>(teams[0])
  if (activeTeam === undefined) {
    return null
  }
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <PlayOnHover>
            <DropdownMenuTrigger
              render={(
                <SidebarMenuButton
                  size='lg'
                  className='data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground'
                />
              )}
            >
              <div className='flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground'>
                {activeTeam.logo}
              </div>
              <div className='grid flex-1 text-left text-sm/tight'>
                <span className='truncate font-medium'>{activeTeam.name}</span>
                <span className='truncate text-xs'>{activeTeam.plan}</span>
              </div>
              <ChevronUpDownIcon className='ml-auto' />
            </DropdownMenuTrigger>
          </PlayOnHover>
          <DropdownMenuPopup
            className='w-fit'
            align='start'
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuGroupLabel className='text-xs text-muted-foreground'>
                {t('teamSwitcher.teams')}
              </DropdownMenuGroupLabel>
              {teams.map((team, index) => (
                <PlayOnHover key={team.name}>
                  <DropdownMenuItem
                    onClick={() => setActiveTeam(team)}
                    className='gap-2 p-2'
                  >
                    <div className='flex size-6 items-center justify-center rounded-md border'>
                      {team.logo}
                    </div>
                    {team.name}
                    <DropdownMenuShortcut>
                      ⌘
                      {index + 1}
                    </DropdownMenuShortcut>
                  </DropdownMenuItem>
                </PlayOnHover>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <PlayOnHover>
                <DropdownMenuItem className='gap-2 p-2'>
                  <div className='flex size-6 items-center justify-center rounded-md border bg-transparent'>
                    <PlusIcon className='size-4' />
                  </div>
                  <div className='font-medium text-muted-foreground'>{t('teamSwitcher.addTeam')}</div>
                </DropdownMenuItem>
              </PlayOnHover>
            </DropdownMenuGroup>
          </DropdownMenuPopup>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
