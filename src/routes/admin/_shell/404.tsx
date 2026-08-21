import { createFileRoute } from '@tanstack/react-router'

import { ShellNotFoundPage } from './-404-page'

export const Route = createFileRoute('/admin/_shell/404')({
  component: ShellNotFoundPage,
  staticData: {
    titleKey: 'titles.notFound',
  },
})
