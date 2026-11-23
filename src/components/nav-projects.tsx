'use client'

import { EllipsisIcon, FolderIcon, ForwardIcon, Trash2Icon } from '@gedatou/cadenza-icons'

import { DropdownMenu, DropdownMenuItem, DropdownMenuPopup, DropdownMenuSeparator, DropdownMenuTrigger, SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuAction, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@gedatou/cadenza-ui'
import { useTranslation } from 'react-i18next'
import { PlayOnHover } from '@/components/icon-motion'

export function NavProjects({
  projects,
}: {
  projects: {
    name: string
    url: string
    icon: React.ReactNode
  }[]
}) {
  const { isMobile } = useSidebar()
  const { t } = useTranslation()
  return (
    <SidebarGroup className='group-data-[collapsible=icon]:hidden'>
      <SidebarGroupLabel>{t('nav.projects.title')}</SidebarGroupLabel>
      <SidebarMenu>
        {projects.map(item => (
          <SidebarMenuItem key={item.name}>
            <PlayOnHover>
              <SidebarMenuButton render={<a href={item.url} />}>
                {item.icon}
                <span>{item.name}</span>
              </SidebarMenuButton>
            </PlayOnHover>
            <DropdownMenu>
              <PlayOnHover>
                <DropdownMenuTrigger
                  render={(
                    <SidebarMenuAction
                      showOnHover
                      className='aria-expanded:bg-muted'
                    />
                  )}
                >
                  <EllipsisIcon />
                  <span className='sr-only'>{t('nav.projects.moreActions')}</span>
                </DropdownMenuTrigger>
              </PlayOnHover>
              <DropdownMenuPopup
                className='w-fit'
                side={isMobile ? 'bottom' : 'right'}
                align={isMobile ? 'end' : 'start'}
              >
                <PlayOnHover>
                  <DropdownMenuItem>
                    <FolderIcon />
                    <span>{t('nav.projects.view')}</span>
                  </DropdownMenuItem>
                </PlayOnHover>
                <PlayOnHover>
                  <DropdownMenuItem>
                    <ForwardIcon />
                    <span>{t('nav.projects.share')}</span>
                  </DropdownMenuItem>
                </PlayOnHover>
                <DropdownMenuSeparator />
                <PlayOnHover>
                  <DropdownMenuItem variant='destructive'>
                    <Trash2Icon />
                    <span>{t('nav.projects.delete')}</span>
                  </DropdownMenuItem>
                </PlayOnHover>
              </DropdownMenuPopup>
            </DropdownMenu>
          </SidebarMenuItem>
        ))}
        <SidebarMenuItem>
          <PlayOnHover>
            <SidebarMenuButton className='text-sidebar-foreground/70'>
              <EllipsisIcon className='text-sidebar-foreground/70' />
              <span>{t('nav.projects.more')}</span>
            </SidebarMenuButton>
          </PlayOnHover>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  )
}
