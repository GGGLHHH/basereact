import { createFileRoute } from '@tanstack/react-router'

import { RegionsLayout } from './-regions-layout'

// 三级父路由:/admin/nested/reports/regions。同样身兼两职——reports 的子,
// 又带 Outlet 承载自己的 index。菜单里它的子(index)无 menuTitle,故显示为叶子。
export const Route = createFileRoute('/admin/_shell/nested/reports/regions')({
  component: RegionsLayout,
  staticData: {
    titleKey: 'titles.nestedRegions',
    menuTitleKey: 'titles.nestedRegions',
    order: 1,
  },
})
