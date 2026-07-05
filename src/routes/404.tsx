import { createFileRoute } from '@tanstack/react-router'

import { NotFoundScreen } from '@/components/error-state'

export const Route = createFileRoute('/404')({
  component: NotFoundScreen,
  staticData: {
    titleKey: 'notFound',
    accessPublic: true,
  },
})
