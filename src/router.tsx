import { QueryClient } from '@tanstack/react-query'
import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { useTranslation } from 'react-i18next'

import { ErrorState } from './components/error-state'
import { globalRouter } from './lib/global-router'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  // Per-request client: a module-level singleton would leak cache across SSR requests.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // ponytail: 4xx never retries, everything else once; steal
          // xchangeai-web's per-status list if a 5xx ever needs excluding
          if (error.status && error.status < 500) {
            return false
          }
          return failureCount < 1
        },
        staleTime: 5 * 60 * 1000,
      },
    },
  })

  const router = createTanStackRouter({
    routeTree,
    // 守卫探针等非 401/403 错误(网络抖动/5xx)从 beforeLoad 抛出时的兜底,
    // 不再落到 TanStack 无样式的内置错误页。
    defaultErrorComponent: RouterError,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
  })

  setupRouterSsrQueryIntegration({ router, queryClient })

  if (typeof window !== 'undefined') {
    globalRouter.instance = router
  }

  return router
}

function RouterError({ error }: { error: Error }) {
  const { t } = useTranslation()
  return (
    <ErrorState
      className='min-h-svh'
      code='Error'
      title={t('errors.generic')}
      description={error.message}
    />
  )
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
