import 'virtual:uno.css'
import '#/i18n'
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { useEffect } from 'react'

import i18next from '#/i18n'
import { detectInitialLocale } from '#/i18n/config'
import { NotFoundScreen } from '#/components/error-state'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
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
        title: 'TanStack Start Starter',
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
    if (locale !== i18next.language) {
      void i18next.changeLanguage(locale)
    }
  }, [])

  return null
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en'>
      <head>
        <HeadContent />
      </head>
      <body>
        <LocaleSync />
        {children}
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
        <Scripts />
      </body>
    </html>
  )
}
