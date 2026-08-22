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

/**
 * 行高与表头高度的**估算值**,沿用迁移前 DataTable 的取值,只用来推下面两个兜底高度。
 *
 * 刻意不叫「实际行高」:AutoFitDataTable 采纳 cadenza 的默认(不虚拟化),行是自然高度,
 * 所以 AUTO_FIT_MIN_HEIGHT / FALLBACK_MAX_HEIGHT 是「大约几行」的量级,不是精确行数。
 * 它们只在两个时刻起作用 —— 首帧测量尚未落地、以及容器小于最小高度。
 */
export const TABLE_ROW_HEIGHT = 53
export const TABLE_HEADER_HEIGHT = 40
const AUTO_FIT_MIN_HEIGHT = TABLE_HEADER_HEIGHT + TABLE_ROW_HEIGHT * 3
const AUTO_FIT_SAFETY_BUFFER = 4

// 「高度受限」的祖先容器。cadenza 与本仓库冻结区各自发出一套 data-slot,两套都要列:
// scroll-area-viewport / popover-content 两边同名;sidebar-inset 只有冻结区的 sidebar.tsx
// 发(admin 布局用的就是它,自适应高度实际量的祖先);而 cadenza 的对话框把
// shadcn 时代的 dialog-content 改叫了 dialog-popup / alert-dialog-popup / dialog-viewport ——
// 漏掉它们的话,放进对话框的表格会一路找到 documentElement、按整个视口高度撑开。
const STABLE_ANCESTOR_SLOTS = new Set([
  'scroll-area-viewport',
  'sidebar-inset',
  'popover-content',
  'dialog-popup',
  'dialog-viewport',
  'alert-dialog-popup',
  // 冻结区里仍有消费者的旧名
  'sheet-content',
  'dialog-content',
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

/**
 * 量出容器可用高度。`enabled=false` 时不挂任何观察器,返回 undefined;
 * 首帧尚未测量时同样返回 undefined —— 调用方自行决定兜底值。
 */
export function useAutoFitHeight(
  containerRef: RefObject<HTMLElement | null>,
  enabled = true,
): number | undefined {
  const minHeight = AUTO_FIT_MIN_HEIGHT
  const safetyBuffer = AUTO_FIT_SAFETY_BUFFER
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
