import type { RefObject } from 'react'
import { useEffect, useState } from 'react'

/**
 * 表格自适应高度 —— 向上找到第一个「高度受限」的祖先,量出本容器到它底边之间被
 * 后续兄弟节点占掉的空间,余下的就是表格能用的高度。
 *
 * 这是 @gedatou/cadenza-ui 的 DataTable 唯一没有的东西:它只接受固定的 `maxHeight`
 * (默认 480)。所以迁移时这段没有被删,而是抽出来喂给它的 `maxHeight`。
 *
 * 从 src/components/table/data-table.tsx 原样搬出,逻辑未改。
 */

/** 单行/表头高度。cadenza DataTable 的 rowHeight 默认值与这里保持一致。 */
export const TABLE_ROW_HEIGHT = 53
export const TABLE_HEADER_HEIGHT = 40
const AUTO_FIT_MIN_HEIGHT = TABLE_HEADER_HEIGHT + TABLE_ROW_HEIGHT * 3
const AUTO_FIT_SAFETY_BUFFER = 4

const STABLE_ANCESTOR_SLOTS = new Set([
  'scroll-area-viewport',
  'sidebar-inset',
  'dialog-content',
  'sheet-content',
  'drawer-content',
  'popover-content',
])

function findLimitedHeightAncestor(start: HTMLElement): HTMLElement {
  let cur: HTMLElement | null = start.parentElement
  while (cur && cur !== document.body) {
    const slot = cur.dataset.slot
    if (slot !== undefined && STABLE_ANCESTOR_SLOTS.has(slot))
      return cur
    cur = cur.parentElement
  }
  return document.documentElement
}

function measureReservedAfter(start: HTMLElement, end: HTMLElement): number {
  let reserved = 0
  let cur: HTMLElement = start

  while (cur.parentElement && cur !== end) {
    const parent = cur.parentElement
    const parentStyle = window.getComputedStyle(parent)
    const children = Array.from(parent.children) as HTMLElement[]
    const idx = children.indexOf(cur)
    if (idx < 0)
      break

    let prevBottom = cur.getBoundingClientRect().bottom
    for (let i = idx + 1; i < children.length; i++) {
      const sibling = children[i]
      const sStyle = window.getComputedStyle(sibling)
      if (
        sStyle.display === 'none'
        || sStyle.position === 'absolute'
        || sStyle.position === 'fixed'
      ) {
        continue
      }
      const sRect = sibling.getBoundingClientRect()
      const gap = sRect.top - prevBottom
      if (gap > 0)
        reserved += gap
      reserved += sRect.height
      prevBottom = sRect.bottom
    }

    if (parent !== end) {
      reserved += Number.parseFloat(parentStyle.paddingBottom) || 0
    }

    cur = parent
  }

  return reserved
}

function computeAutoFitHeight(container: HTMLElement, safetyBuffer: number): number {
  const ancestor = findLimitedHeightAncestor(container)
  const containerRect = container.getBoundingClientRect()
  const reserved = measureReservedAfter(container, ancestor)
  // documentElement's height includes the table itself, so measuring its rect
  // feeds our own height back into the computation (2px/frame ratchet collapse
  // in document-flow layouts). The viewport is the stable bound there.
  const ancestorBottom
    = ancestor === document.documentElement
      ? window.innerHeight
      : ancestor.getBoundingClientRect().bottom
  return ancestorBottom - containerRect.top - reserved - safetyBuffer
}

interface UseAutoFitHeightOptions {
  enabled: boolean
  minHeight: number
  safetyBuffer: number
}

function useAutoFitHeightImpl(
  containerRef: RefObject<HTMLElement | null>,
  { enabled, minHeight, safetyBuffer }: UseAutoFitHeightOptions,
): number | undefined {
  // The measurement only means anything while auto-fit is on, so the disabled
  // case is derived during render instead of reset from inside the effect
  // (which would cost an extra render on every toggle).
  const [measured, setMeasured] = useState<number | undefined>(undefined)

  useEffect(() => {
    if (!enabled) {
      return
    }
    const container = containerRef.current
    if (!container || typeof window === 'undefined')
      return

    let rafId = 0
    const ancestor = findLimitedHeightAncestor(container)

    const recompute = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        const node = containerRef.current
        if (!node)
          return
        const next = computeAutoFitHeight(node, safetyBuffer)
        setMeasured(Math.max(Math.round(next), minHeight))
      })
    }

    const observer = new ResizeObserver(recompute)

    let cur: HTMLElement | null = container
    const observed = new Set<Element>()
    const observe = (el: Element) => {
      if (observed.has(el))
        return
      observed.add(el)
      observer.observe(el)
    }
    observe(container)
    while (cur && cur !== ancestor.parentElement) {
      observe(cur)
      const parent = cur.parentElement
      if (parent) {
        const children = Array.from(parent.children)
        const idx = children.indexOf(cur)
        for (let i = idx + 1; i < children.length; i++) observe(children[i])
      }
      if (cur === ancestor)
        break
      cur = cur.parentElement
    }

    // documentElement doesn't scroll itself — its "scroll" fires on window, and
    // the layout it bounds only changes on resize, which is covered below.
    const scrollAncestor = ancestor === document.documentElement ? null : ancestor
    scrollAncestor?.addEventListener('scroll', recompute, { passive: true })

    window.addEventListener('resize', recompute)
    recompute()

    return () => {
      cancelAnimationFrame(rafId)
      observer.disconnect()
      scrollAncestor?.removeEventListener('scroll', recompute)
      window.removeEventListener('resize', recompute)
    }
  }, [enabled, minHeight, safetyBuffer, containerRef])

  return enabled ? measured : undefined
}

/**
 * 量出容器可用高度。`enabled=false` 时不挂任何观察器,返回 undefined。
 * 首帧尚未测量时也返回 undefined —— 调用方自行决定兜底值。
 */
export function useAutoFitHeight(
  containerRef: RefObject<HTMLElement | null>,
  enabled = true,
): number | undefined {
  return useAutoFitHeightImpl(containerRef, {
    enabled,
    minHeight: AUTO_FIT_MIN_HEIGHT,
    safetyBuffer: AUTO_FIT_SAFETY_BUFFER,
  })
}
