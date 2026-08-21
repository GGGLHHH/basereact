import { createFileRoute } from '@tanstack/react-router'

import { FrontendHomePage } from './-home-page'

export const Route = createFileRoute('/frontend/_shell/home')({
  component: FrontendHomePage,
  staticData: {
    titleKey: 'titles.frontendHome',
  },
})
