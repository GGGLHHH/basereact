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
//
// 项在滚动区里时,容器要放在滚动区**里面**(包住滚动内容),pill 才随原生滚动走、被
// overflow 裁掉;放在滚动区外,pill 的定位只能靠 JS 追 scroll 事件,永远慢一帧。

const HOVER_DURATION = 0.35
const EASE = 'power3.out'

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
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
  // 激活项变了 → 置 true:布局还在变(折叠展开把它推出视口)时持续把它滚进视野;
  // 用户一动手(滚轮 / 触摸 / 点按 / 键盘)就交还滚动权,不跟用户抢。
  const revealRef = React.useRef(false)

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

  // 对齐激活项;还在 reveal 期就先把它滚进视野(nearest = 已可见则不动)。
  const alignActive = React.useCallback((animate: boolean) => {
    const el = activeEl()
    if (revealRef.current) {
      el?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    }
    moveTo(el, animate)
  }, [activeEl, moveTo])

  // 初次挂载 / 激活项(activeKey)变化 / enable 切换:激活项滚进视野并对齐(首帧瞬切,
  // 之后滑动)。正在 hover 时不抢 pill,交给 hover/leave 处理。
  React.useLayoutEffect(() => {
    if (!enabled) {
      if (pillRef.current) {
        gsap.set(pillRef.current, { autoAlpha: 0 })
      }
      firstRef.current = true
      return
    }
    revealRef.current = true
    if (hoveringRef.current) {
      return
    }
    alignActive(!firstRef.current)
    firstRef.current = false
  }, [activeKey, enabled, alignActive])

  // 布局变化(折叠展开 / resize)→ 重新对齐(非 hover 时)。
  React.useEffect(() => {
    const container = containerRef.current
    if (!enabled || !container) {
      return
    }
    const observer = new ResizeObserver(() => {
      if (!hoveringRef.current) {
        alignActive(true)
      }
    })
    observer.observe(container)
    const stopReveal = () => {
      revealRef.current = false
    }
    const userEvents = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const
    for (const type of userEvents) {
      container.addEventListener(type, stopReveal, { capture: true, passive: true })
    }
    return () => {
      observer.disconnect()
      for (const type of userEvents) {
        container.removeEventListener(type, stopReveal, { capture: true })
      }
    }
  }, [enabled, alignActive])

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
      {enabled
        ? (
            <div
              ref={pillRef}
              aria-hidden='true'
              // isolate 建栈上下文 + -z-10:pill 沉到容器内容之下,项文字在其上。
              className={cn('pointer-events-none absolute top-0 left-0 -z-10 opacity-0', pillClassName)}
              style={{ willChange: 'transform, width, height' }}
            />
          )
        : null}
      {children}
    </div>
  )
}
