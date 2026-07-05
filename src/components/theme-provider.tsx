'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'

import type { ReactNode } from 'react'

// next-themes 把主题挂到 <html class="dark">,配合 styles.css 的 @custom-variant dark。
// disableTransitionOnChange:切换瞬间关掉 CSS 过渡,交给 view-transition 圆形揭示
// (见 lib/theme-transition.ts),避免两套动画打架。
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute='class'
      defaultTheme='system'
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  )
}
