import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { WidgetsPage } from './-widgets-page'

// 非法/缺失一律回默认值(catch),不抛错误页;size 上限对齐后端 clamp [1,100]。
const widgetsSearchSchema = z.object({
  page: z.number().int().min(1).catch(1),
  size: z.number().int().min(1).max(100).catch(20),
})

export const Route = createFileRoute('/admin/_shell/widgets')({
  component: WidgetsPage,
  validateSearch: widgetsSearchSchema,
  staticData: {
    titleKey: 'titles.adminWidgets',
    menuTitleKey: 'titles.adminWidgets',
    icon: 'i-tabler-box',
    groupKey: 'menuGroups.admin',
    // 页面主数据就是这个操作,准入随它:缺 users:admin 时菜单不出现、直连进壳内 403。
    accessPolicyKeys: ['adminListWidgets'],
  },
})
