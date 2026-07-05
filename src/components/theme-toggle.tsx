'use client'

import { useTheme } from 'next-themes'
import { useTranslation } from 'react-i18next'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { toggleThemeWithTransition } from '@/lib/theme-transition'
import {
  IconCheck,
  IconChevronRight,
  IconDeviceDesktop,
  IconMoon,
  IconSun,
  IconSunMoon,
} from '@tabler/icons-react'

// 主题切换:侧栏底部图标按钮,dropdown 选 浅色/深色/跟随系统(当前项打勾)。
// 切换走 view-transition 圆形揭示;目标解析色与当前一致时跳过动画(无视觉变化)。
// 收起态:label sr-only + chevron 隐藏,dropdown 向右飞出。与 LanguageSwitcher 同构。
const THEME_OPTIONS = [
  { value: 'light', Icon: IconSun, labelKey: 'theme.light' },
  { value: 'dark', Icon: IconMoon, labelKey: 'theme.dark' },
  { value: 'system', Icon: IconDeviceDesktop, labelKey: 'theme.system' },
] as const

export function ThemeToggle() {
  const { t } = useTranslation()
  const { isMobile } = useSidebar()
  const { theme, setTheme, resolvedTheme, systemTheme } = useTheme()

  function handleSelect(next: string) {
    if (next === theme) {
      return
    }
    const nextResolved = next === 'system' ? systemTheme : next
    if (nextResolved === resolvedTheme) {
      setTheme(next)
      return
    }
    toggleThemeWithTransition(() => setTheme(next))
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger render={<SidebarMenuButton tooltip={t('theme.changeTheme')} />}>
            <IconSunMoon />
            <span className='group-data-[collapsible=icon]:sr-only'>{t('theme.changeTheme')}</span>
            <IconChevronRight className='ml-auto size-3.5 text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden' />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side={isMobile ? 'bottom' : 'right'}
            align='end'
            className='min-w-40'
          >
            {THEME_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => handleSelect(option.value)}
              >
                <option.Icon className='size-4' />
                <span className='flex-1'>{t(option.labelKey)}</span>
                {option.value === theme ? <IconCheck className='size-4' /> : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
