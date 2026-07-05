'use client'

import gsap from 'gsap'
import * as React from 'react'

// 滑动高亮(GSAP):菜单项自身背景透明,一枚绝对定位的 pill 跟着 hover 项滑动;
// 鼠标离开菜单则滑回当前激活项(data-nav-active="true")。整棵展开树共用一枚 pill,
// 位置按每个 hover 项(data-nav-item)相对容器实测,支持竖向 + 缩进变化。
// ResizeObserver 兜住折叠展开 / resize 的布局位移;prefers-reduced-motion 时瞬切不 tween。
//
// 用法:<SidebarNavHighlight enabled={展开态} activeKey={pathname}>{菜单}</SidebarNavHighlight>
// 消费端给每个可 hover 的按钮加 data-nav-item;激活项再加 data-nav-active="true",
// 并把按钮自身的 hover/active 背景抹掉(交给 pill)。

const HOVER_DURATION = 0.35
const EASE = 'power3.out'

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export function SidebarNavHighlight({
  activeKey,
  enabled,
  children,
}: {
  // 变了就把 pill 滑到新的激活项(通常传当前 pathname)。
  activeKey: string
  enabled: boolean
  children: React.ReactNode
}) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const pillRef = React.useRef<HTMLDivElement>(null)
  const hoveringRef = React.useRef(false)
  const firstRef = React.useRef(true)

  const moveTo = React.useCallback((el: HTMLElement | null, animate: boolean) => {
    const pill = pillRef.current
    const container = containerRef.current
    if (!pill || !container) {
      return
    }
    if (!el) {
      gsap.to(pill, { autoAlpha: 0, duration: 0.15, overwrite: true })
      return
    }
    const c = container.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    gsap.to(pill, {
      autoAlpha: 1,
      duration: animate && !prefersReducedMotion() ? HOVER_DURATION : 0,
      ease: EASE,
      height: r.height,
      overwrite: true,
      width: r.width,
      x: r.left - c.left,
      y: r.top - c.top,
    })
  }, [])

  const activeEl = React.useCallback(
    () => containerRef.current?.querySelector<HTMLElement>('[data-nav-active="true"]') ?? null,
    [],
  )

  // 初次挂载 / 激活项(activeKey)变化 / enable 切换:对齐激活项(首帧瞬切,之后滑动)。
  // 正在 hover 时不抢 pill,交给 hover/leave 处理。
  React.useLayoutEffect(() => {
    if (!enabled) {
      if (pillRef.current) {
        gsap.set(pillRef.current, { autoAlpha: 0 })
      }
      firstRef.current = true
      return
    }
    if (hoveringRef.current) {
      return
    }
    moveTo(activeEl(), !firstRef.current)
    firstRef.current = false
  }, [activeKey, enabled, activeEl, moveTo])

  // 折叠展开 / resize 改变布局 → 重新对齐(非 hover 时)。
  React.useEffect(() => {
    const container = containerRef.current
    if (!enabled || !container) {
      return
    }
    const observer = new ResizeObserver(() => {
      if (!hoveringRef.current) {
        moveTo(activeEl(), true)
      }
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [enabled, activeEl, moveTo])

  function handlePointerOver(event: React.PointerEvent<HTMLDivElement>) {
    if (!enabled) {
      return
    }
    const item = (event.target as HTMLElement).closest<HTMLElement>('[data-nav-item]')
    if (item && containerRef.current?.contains(item)) {
      hoveringRef.current = true
      moveTo(item, true)
    }
  }

  function handlePointerLeave() {
    if (!enabled) {
      return
    }
    hoveringRef.current = false
    moveTo(activeEl(), true)
  }

  return (
    <div
      ref={containerRef}
      className='relative isolate'
      onPointerOver={handlePointerOver}
      onPointerLeave={handlePointerLeave}
    >
      {enabled ? (
        <div
          ref={pillRef}
          aria-hidden='true'
          // isolate 建栈上下文 + -z-10:pill 沉到容器内容之下,菜单项文字在其上。
          className='pointer-events-none absolute top-0 left-0 -z-10 rounded-md bg-sidebar-accent opacity-0'
          style={{ willChange: 'transform, width, height' }}
        />
      ) : null}
      {children}
    </div>
  )
}
