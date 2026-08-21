import { createFileRoute } from '@tanstack/react-router'

import { ShellForbiddenPage } from './-403-page'

export const Route = createFileRoute('/admin/_shell/403')({
  component: ShellForbiddenPage,
  staticData: {
    titleKey: 'titles.forbidden',
  },
})
