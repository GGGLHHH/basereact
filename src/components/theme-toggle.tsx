'use client'

import { CheckIcon, ChevronRightIcon, ContrastIcon, MoonIcon, SunIcon, SunMoonIcon } from '@gedatou/cadenza-icons'

import { DropdownMenu, DropdownMenuItem, DropdownMenuPopup, DropdownMenuTrigger, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@gedatou/cadenza-ui'
import { useTheme } from 'next-themes'

import { useTranslation } from 'react-i18next'
import { PlayOnHover } from '@/components/icon-motion'
import { toggleThemeWithTransition } from '@/lib/theme-transition'

// 主题切换:侧栏底部图标按钮,dropdown 选 浅色/深色/跟随系统(当前项打勾)。
// 切换走 view-transition 圆形揭示;目标解析色与当前一致时跳过动画(无视觉变化)。
// 收起态:label sr-only + chevron 隐藏,dropdown 向右飞出。与 LanguageSwitcher 同构。
const THEME_OPTIONS = [
  { value: 'light', Icon: SunIcon, labelKey: 'theme.light' },
  { value: 'dark', Icon: MoonIcon, labelKey: 'theme.dark' },
  // 「跟随系统」:动画图标集里没有显示器,用半明半暗的 Contrast。
  { value: 'system', Icon: ContrastIcon, labelKey: 'theme.system' },
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
          <PlayOnHover>
            <DropdownMenuTrigger render={<SidebarMenuButton tooltip={t('theme.changeTheme')} />}>
              <SunMoonIcon />
              <span className='group-data-[collapsible=icon]:sr-only'>{t('theme.changeTheme')}</span>
              <ChevronRightIcon className='ml-auto size-3.5 text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden' />
            </DropdownMenuTrigger>
          </PlayOnHover>
          <DropdownMenuPopup
            side={isMobile ? 'bottom' : 'right'}
            align='end'
            className='min-w-40'
          >
            {THEME_OPTIONS.map(option => (
              <PlayOnHover key={option.value}>
                <DropdownMenuItem onClick={() => handleSelect(option.value)}>
                  <option.Icon className='size-4' />
                  <span className='flex-1'>{t(option.labelKey)}</span>
                  {/* 当前项的勾:菜单打开时画一遍,不跟整行悬停。 */}
                  {option.value === theme
                    ? (
                        <CheckIcon
                          animate
                          className='size-4'
                        />
                      )
                    : null}
                </DropdownMenuItem>
              </PlayOnHover>
            ))}
          </DropdownMenuPopup>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
