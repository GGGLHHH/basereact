import { ChevronRightIcon } from '@gedatou/cadenza-icons'
import { Collapsible, CollapsiblePanel, CollapsibleTrigger, SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem } from '@gedatou/cadenza-ui'
import { useTranslation } from 'react-i18next'
import { PlayOnHover } from '@/components/icon-motion'

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: React.ReactNode
    isActive?: boolean
    items?: {
      title: string
      url: string
    }[]
  }[]
}) {
  const { t } = useTranslation()
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{t('nav.main.platform')}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map(item => (
          <Collapsible
            key={item.title}
            defaultOpen={item.isActive}
            className='group/collapsible'
            render={<SidebarMenuItem />}
          >
            <PlayOnHover>
              <CollapsibleTrigger render={<SidebarMenuButton tooltip={item.title} />}>
                {item.icon}
                <span>{item.title}</span>
                <ChevronRightIcon className='ml-auto transition-transform duration-200 group-data-open/collapsible:rotate-90' />
              </CollapsibleTrigger>
            </PlayOnHover>
            <CollapsiblePanel>
              <SidebarMenuSub>
                {item.items?.map(subItem => (
                  <SidebarMenuSubItem key={subItem.title}>
                    <SidebarMenuSubButton render={<a href={subItem.url} />}>
                      <span>{subItem.title}</span>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            </CollapsiblePanel>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
