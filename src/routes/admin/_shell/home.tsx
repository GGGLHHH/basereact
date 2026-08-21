import { createFileRoute } from '@tanstack/react-router'

import { AdminHomePage } from './-home-page'

export const Route = createFileRoute('/admin/_shell/home')({
  component: AdminHomePage,
  staticData: {
    titleKey: 'titles.adminHome',
    menuTitleKey: 'titles.adminHome',
    icon: 'i-tabler-home',
    groupKey: 'menuGroups.admin',
    order: 0,
  },
})
