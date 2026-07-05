import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { useLogout } from '@/api/auth'
import { useMyProfile } from '@/api/profile'
import { nameInitials } from '@/lib/display-name'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { IconSelector, IconUserCircle, IconLogout } from '@tabler/icons-react'

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
}) {
  const { t } = useTranslation()
  const { isMobile } = useSidebar()
  const navigate = useNavigate()
  const logout = useLogout()
  // 头像来自个人资料(与 profile 页共用 profile.me 缓存);未取到时回退传入头像。
  const { data: profile } = useMyProfile()

  const avatarSrc = profile?.avatar_url ?? user.avatar
  // 首字母兜底:优先 display_name,空则回退登录名(nameInitials 空名→'?')。
  const fallback = nameInitials(profile?.display_name || user.name)

  function handleLogout() {
    // 登出接口失败也照样去登录页:本地会话状态已不可信。
    void logout
      .mutateAsync()
      .catch(() => undefined)
      .finally(() => void navigate({ to: '/admin/login' }))
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size='lg'
                className='aria-expanded:bg-muted'
              />
            }
          >
            <Avatar>
              <AvatarImage
                src={avatarSrc || undefined}
                alt={user.name}
              />
              <AvatarFallback>{fallback}</AvatarFallback>
            </Avatar>
            <div className='grid flex-1 text-left text-sm/tight'>
              <span className='truncate font-medium'>{user.name}</span>
              <span className='truncate text-xs'>{user.email}</span>
            </div>
            <IconSelector className='ml-auto size-4' />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className='w-fit'
            side={isMobile ? 'bottom' : 'right'}
            align='end'
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className='p-0 font-normal'>
                <div className='flex items-center gap-2 px-1 py-1.5 text-left text-sm'>
                  <Avatar>
                    <AvatarImage
                      src={avatarSrc || undefined}
                      alt={user.name}
                    />
                    <AvatarFallback>{fallback}</AvatarFallback>
                  </Avatar>
                  <div className='grid flex-1 text-left text-sm/tight'>
                    <span className='truncate font-medium'>{user.name}</span>
                    <span className='truncate text-xs'>{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void navigate({ to: '/admin/profile' })}>
              <IconUserCircle />
              {t('nav.user.profile')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <IconLogout />
              {t('nav.user.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
