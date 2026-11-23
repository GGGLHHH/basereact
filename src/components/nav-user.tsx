import { ChevronUpDownIcon, CircleUserRoundIcon, LogOutIcon } from '@gedatou/cadenza-icons'
import { DropdownMenu, DropdownMenuGroup, DropdownMenuGroupLabel, DropdownMenuItem, DropdownMenuPopup, DropdownMenuSeparator, DropdownMenuTrigger, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@gedatou/cadenza-ui'
import { useNavigate } from '@tanstack/react-router'

import { useTranslation } from 'react-i18next'
import { useLogout } from '@/api/auth'
import { useMyProfile } from '@/api/profile'
import { PlayOnHover } from '@/components/icon-motion'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { nameInitials } from '@/lib/display-name'

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
  const displayName = profile?.display_name ?? ''
  const fallback = nameInitials(displayName === '' ? user.name : displayName)

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
          <PlayOnHover>
            <DropdownMenuTrigger
              render={(
                <SidebarMenuButton
                  size='lg'
                  className='aria-expanded:bg-muted'
                />
              )}
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
              <ChevronUpDownIcon className='ml-auto size-4' />
            </DropdownMenuTrigger>
          </PlayOnHover>
          <DropdownMenuPopup
            className='w-fit'
            side={isMobile ? 'bottom' : 'right'}
            align='end'
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuGroupLabel className='p-0 font-normal'>
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
              </DropdownMenuGroupLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <PlayOnHover>
              <DropdownMenuItem onClick={() => void navigate({ to: '/admin/profile' })}>
                <CircleUserRoundIcon />
                {t('nav.user.profile')}
              </DropdownMenuItem>
            </PlayOnHover>
            <DropdownMenuSeparator />
            <PlayOnHover>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOutIcon />
                {t('nav.user.logout')}
              </DropdownMenuItem>
            </PlayOnHover>
          </DropdownMenuPopup>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
