'use client'

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
import {
  LOCALE_NATIVE_NAMES,
  normalizeLocale,
  persistLocale,
  SUPPORTED_LOCALES,
} from '@/i18n/config'
import { IconCheck, IconLanguage } from '@tabler/icons-react'

// 语言切换:侧栏底部一枚图标按钮,dropdown 列出各语言(原生名 + 当前项打勾)。
// changeLanguage 触发 <html lang> 同步(见 i18n/index.ts);持久化在此显式做,
// 不挂 languageChanged 事件——否则 init 的默认语言会覆盖偏好(刷新丢失)。
// 收起态:label sr-only(留可读名),dropdown 向右飞出。
export function LanguageSwitcher() {
  const { i18n, t } = useTranslation()
  const { isMobile } = useSidebar()
  const current = normalizeLocale(i18n.language)

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                aria-label={t('language')}
                tooltip={LOCALE_NATIVE_NAMES[current]}
              />
            }
          >
            <IconLanguage />
            <span className='group-data-[collapsible=icon]:sr-only'>
              {LOCALE_NATIVE_NAMES[current]}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side={isMobile ? 'bottom' : 'right'}
            align='end'
            className='min-w-40'
          >
            {SUPPORTED_LOCALES.map((locale) => (
              <DropdownMenuItem
                key={locale}
                onClick={() => {
                  void i18n.changeLanguage(locale)
                  persistLocale(locale)
                }}
              >
                <span className='flex-1'>{LOCALE_NATIVE_NAMES[locale]}</span>
                {locale === current ? <IconCheck className='size-4' /> : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
