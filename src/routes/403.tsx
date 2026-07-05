import { createFileRoute } from '@tanstack/react-router'

import { ForbiddenScreen } from '@/components/error-state'

export const Route = createFileRoute('/403')({
  component: ForbiddenScreen,
  staticData: {
    titleKey: 'forbidden',
    accessPublic: true,
  },
})
