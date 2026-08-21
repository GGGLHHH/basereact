import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext } from '@tanstack/react-router'
import { NotFoundScreen } from '#/components/error-state'

import i18next from '#/i18n'
import appCss from '../styles.css?url'
import { RootDocument } from './-root-document'
import 'virtual:uno.css'

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
