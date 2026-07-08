'use client'

import gsap from 'gsap'
import * as React from 'react'

import { cn } from '@/lib/utils'

// 滑动高亮(GSAP),与具体场景解耦:一枚绝对定位的 pill 跟着 hover 项滑动;鼠标离开则
// 滑回当前激活项(data-mh-active="true")。整组子项共用一枚 pill,位置按每个可 hover 项
// (data-mh-item)相对容器实测,支持竖向/横向 + 尺寸变化。ResizeObserver 兜住布局位移;
// prefers-reduced-motion 时瞬切不 tween。适用于 sidebar、tab bar、segmented control 等任何
// "一组项 + 一枚跟随高亮" 的结构。
//
// 用法:
//   <MovingHighlight enabled activeKey={activeId} pillClassName='rounded-md bg-accent'>
//     {items.map((it) => (
//       <button key={it.id} {...movingHighlightItemProps(it.id === activeId)}>…</button>
//     ))}
//   </MovingHighlight>
// 每个可 hover 项 spread movingHighlightItemProps;激活项传 active=true。项自身的 hover/
// active 背景通常要抹掉(交给 pill)。

const HOVER_DURATION = 0.35
const EASE = 'power3.out'

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

// 可 hover 项的标记属性;激活项额外带 active。enabled=false 时不挂(高亮整体关掉的场景,
// 如侧栏收起态)。spread 到项元素上即可。
export function movingHighlightItemProps(
  active: boolean,
  enabled = true,
): { 'data-mh-item'?: string; 'data-mh-active'?: string } {
  return {
    'data-mh-item': enabled ? '' : undefined,
    'data-mh-active': enabled && active ? 'true' : undefined,
  }
}

export function MovingHighlight({
  activeKey,
  enabled,
  children,
  className,
  pillClassName = 'rounded-md bg-accent',
}: {
  // 变了就把 pill 滑到新的激活项(通常传当前激活项的 id / pathname)。
  activeKey: string
  enabled: boolean
  children: React.ReactNode
  // 容器类,合进机制类 `relative isolate`。整块要撑满某布局(如整条侧栏的 flex 列)
  // 时传 `flex size-full flex-col` 之类,让容器顶替原布局节点而不塌陷。
  className?: string
  // pill 的观感类(圆角 + 底色),机制类由组件自带。默认 accent。
  pillClassName?: string
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
    () => containerRef.current?.querySelector<HTMLElement>('[data-mh-active="true"]') ?? null,
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

  // 布局变化(折叠展开 / resize)→ 重新对齐(非 hover 时)。
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
    const item = (event.target as HTMLElement).closest<HTMLElement>('[data-mh-item]')
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
      className={cn('relative isolate', className)}
      onPointerOver={handlePointerOver}
      onPointerLeave={handlePointerLeave}
    >
      {enabled ? (
        <div
          ref={pillRef}
          aria-hidden='true'
          // isolate 建栈上下文 + -z-10:pill 沉到容器内容之下,项文字在其上。
          className={cn('pointer-events-none absolute top-0 left-0 -z-10 opacity-0', pillClassName)}
          style={{ willChange: 'transform, width, height' }}
        />
      ) : null}
      {children}
    </div>
  )
}
