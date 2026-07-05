import 'virtual:uno.css'
import '#/i18n'
import { HeadContent, Scripts, createRootRouteWithContext } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { useEffect } from 'react'

import type { QueryClient } from '@tanstack/react-query'

import i18next from '#/i18n'
import { detectInitialLocale } from '#/i18n/config'
import { NotFoundScreen } from '#/components/error-state'
import { Toaster } from '#/components/feedback/toaster'
import { ThemeProvider } from '#/components/theme-provider'

import appCss from '../styles.css?url'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: i18next.t('appTitle'),
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  notFoundComponent: NotFoundScreen,
  shellComponent: RootDocument,
})

// SSR 恒以 DEFAULT_LOCALE 出首屏;hydration 后按 localStorage/浏览器语言切换,
// 避免服务端-客户端首帧不一致(hydration mismatch)。
function LocaleSync() {
  useEffect(() => {
    const locale = detectInitialLocale()
    if (locale === i18next.language) {
      return
    }
    // 推迟到 hydration commit 之后:changeLanguage 触发 react-i18next 全树重渲,
    // 若落在 hydration 的 startTransition 窗口里,会对尚未挂载的组件 setState 而告警。
    // 宏任务(setTimeout 0)确保此刻全树已挂载,语言切换退化成普通更新。
    const timer = setTimeout(() => {
      void i18next.changeLanguage(locale)
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  return null
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang='en'
      suppressHydrationWarning
    >
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider>
          <LocaleSync />
          {children}
          <Toaster />
          <TanStackDevtools
            config={{
              position: 'bottom-right',
            }}
            plugins={[
              {
                name: 'Tanstack Router',
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          />
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  )
}
