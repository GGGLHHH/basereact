'use client'

import type * as React from 'react'

import { MovingHighlight } from '@/components/moving-highlight'

// 侧栏滑动高亮:底层机制在 MovingHighlight,这里只固定 pill 用 sidebar-accent(与
// SidebarMenuButton 的 data-active 同款)。消费端(app-sidebar)给菜单项 spread
// movingHighlightItemProps,并抹掉按钮自身 hover/active 背景(交给 pill)。
export function SidebarNavHighlight(props: {
  activeKey: string
  enabled: boolean
  children: React.ReactNode
  // 容器类,透传给 MovingHighlight(如包整条侧栏时传 flex 撑满类)。
  className?: string
}) {
  return (
    <MovingHighlight
      pillClassName='rounded-md bg-sidebar-accent'
      {...props}
    />
  )
}
