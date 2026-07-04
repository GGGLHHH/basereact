import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDebounceFn } from 'ahooks'
import { useTheme } from 'next-themes'

// Sub-pixel tolerance: browsers can report fractional scrollTop / scrollWidth
// values (e.g. 0.5px on HiDPI displays or 1px rounding between scrollHeight
// and clientHeight). Without a tolerance the edge / start checks misfire,
// leaving shadows visible when the user is already pinned to the edge or
// when the container is not actually scrollable.
const SCROLL_SHADOW_EPSILON = 1

interface UseScrollShadowOptions {
  horizontalShadowOffset?: {
    left?: number
    right?: number
  }
  scrollContainerSelector?: string
  lightShadowColor?: string
  darkShadowColor?: string
  shadowSpread?: number
  shadowBlur?: number
  showVerticalShadows?: boolean
  topShadowOffset?: number
}

// Check if an element can scroll on either axis.
function isScrollable(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element)
  const overflowX = style.overflowX
  const overflowY = style.overflowY

  if (
    overflowX === 'auto' ||
    overflowX === 'scroll' ||
    overflowY === 'auto' ||
    overflowY === 'scroll'
  ) {
    return true
  }

  return element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight
}

// Find the first scrollable element in the tree.
function findScrollableElement(root: HTMLElement): HTMLElement | null {
  if (isScrollable(root)) {
    return root
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
    acceptNode: (node) => {
      if (isScrollable(node as HTMLElement)) {
        return NodeFilter.FILTER_ACCEPT
      }
      return NodeFilter.FILTER_SKIP
    },
  })

  return walker.nextNode() as HTMLElement | null
}

// Hook that adds scroll shadows to a wrapper element.
export function useScrollShadow<T extends HTMLElement = HTMLDivElement>(
  options: UseScrollShadowOptions | undefined = {},
) {
  const {
    lightShadowColor = 'color-mix(in oklab, var(--foreground) 15%, transparent)',
    darkShadowColor = 'color-mix(in oklab, var(--foreground) 15%, transparent)',
    horizontalShadowOffset,
    shadowBlur = 10,
    shadowSpread = 10,
    scrollContainerSelector = 'auto',
    showVerticalShadows = false,
    topShadowOffset = 0,
  } = options

  const { resolvedTheme } = useTheme()

  // Select the shadow color based on the current theme.
  const shadowColor = useMemo(
    () => (resolvedTheme === 'dark' ? darkShadowColor : lightShadowColor),
    [resolvedTheme, darkShadowColor, lightShadowColor],
  )

  const [wrapper, setWrapper] = useState<T | null>(null)
  const [scrollContainer, setScrollContainer] = useState<HTMLElement | null>(null)
  const leftShadowOffset = horizontalShadowOffset?.left ?? 0
  const rightShadowOffset = horizontalShadowOffset?.right ?? 0

  // Store shadow state in a ref to avoid unnecessary re-renders.
  const scrollStateRef = useRef({
    bottomShadow: false,
    leftShadow: false,
    rightShadow: false,
    topShadow: false,
  })

  const wrapperRef = useCallback(
    (node: T | null) => {
      setWrapper(node)

      if (!node) {
        setScrollContainer(null)
        return
      }

      let container: HTMLElement | null = null

      if (scrollContainerSelector === 'auto') {
        container = findScrollableElement(node)
      } else if (scrollContainerSelector === 'self') {
        container = node
      } else {
        container = node.querySelector(scrollContainerSelector) as HTMLElement
      }

      if (!container) {
        return
      }

      setScrollContainer(container)
    },
    [scrollContainerSelector],
  )

  // Create and manage shadow styles.
  useEffect(() => {
    if (!wrapper) return

    const styleId = `scroll-shadow-${Math.random().toString(36).slice(2, 9)}`
    const styleEl = document.createElement('style')
    styleEl.id = styleId

    const className = `scroll-shadow-${styleId}`
    wrapper.classList.add(className)

    const topShadowEl = document.createElement('div')
    const bottomShadowEl = document.createElement('div')
    topShadowEl.setAttribute('aria-hidden', 'true')
    bottomShadowEl.setAttribute('aria-hidden', 'true')
    topShadowEl.dataset.slot = 'scroll-shadow-top'
    bottomShadowEl.dataset.slot = 'scroll-shadow-bottom'
    topShadowEl.className = 'scroll-shadow-edge scroll-shadow-edge-top'
    bottomShadowEl.className = 'scroll-shadow-edge scroll-shadow-edge-bottom'

    if (showVerticalShadows) {
      wrapper.append(topShadowEl, bottomShadowEl)
    }

    styleEl.textContent = `
      .${className} {
        position: relative;
      }

      .${className}::before,
      .${className}::after {
        content: "";
        position: absolute;
        top: 0;
        width: ${shadowSpread}px;
        bottom: 0;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.3s;
        z-index: 9;
      }

      .${className}::before {
        left: ${leftShadowOffset}px;
        box-shadow: inset ${shadowBlur}px 0 ${shadowBlur}px -${shadowSpread}px ${shadowColor};
      }

      .${className}::after {
        right: ${rightShadowOffset}px;
        box-shadow: inset -${shadowBlur}px 0 ${shadowBlur}px -${shadowSpread}px ${shadowColor};
      }

      .${className}.show-left-shadow::before {
        opacity: 1;
      }

      .${className}.show-right-shadow::after {
        opacity: 1;
      }

      .${className} > .scroll-shadow-edge {
        position: absolute;
        left: 0;
        right: 0;
        height: ${shadowSpread}px;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.3s;
        z-index: 9;
      }

      .${className} > .scroll-shadow-edge-top {
        top: ${topShadowOffset}px;
        box-shadow: inset 0 ${shadowBlur}px ${shadowBlur}px -${shadowSpread}px ${shadowColor};
      }

      .${className} > .scroll-shadow-edge-bottom {
        bottom: 0;
        box-shadow: inset 0 -${shadowBlur}px ${shadowBlur}px -${shadowSpread}px ${shadowColor};
      }

      .${className}.show-top-shadow > .scroll-shadow-edge-top {
        opacity: 1;
      }

      .${className}.show-bottom-shadow > .scroll-shadow-edge-bottom {
        opacity: 1;
      }
    `

    document.head.appendChild(styleEl)

    return () => {
      wrapper.classList.remove(
        className,
        'show-bottom-shadow',
        'show-left-shadow',
        'show-right-shadow',
        'show-top-shadow',
      )
      // The classes are gone; reset the cached state to match, or the next
      // visibility pass diff-skips re-adding them and shadows stay invisible.
      scrollStateRef.current = {
        bottomShadow: false,
        leftShadow: false,
        rightShadow: false,
        topShadow: false,
      }
      topShadowEl.remove()
      bottomShadowEl.remove()
      document.head.removeChild(styleEl)
    }
  }, [
    wrapper,
    shadowColor,
    shadowBlur,
    shadowSpread,
    showVerticalShadows,
    topShadowOffset,
    leftShadowOffset,
    rightShadowOffset,
  ])

  // Update shadow visibility with debounce to avoid excessive DOM writes.
  const { run: updateShadowVisibility } = useDebounceFn(
    (container: HTMLElement, wrapperElement: HTMLElement) => {
      const { scrollLeft, scrollTop, scrollWidth, scrollHeight, clientWidth, clientHeight } =
        container

      const currentState = scrollStateRef.current

      // Apply an epsilon to every comparison so sub-pixel scroll positions
      // and 1px rounding between scroll/client dimensions don't keep edge
      // shadows visible. Both axes are gated on the matching axis having
      // real scrollable content to stay symmetric (start ↔ end).
      const maxScrollLeft = scrollWidth - clientWidth
      const maxScrollTop = scrollHeight - clientHeight
      const hasHorizontalScrollableContent = maxScrollLeft > SCROLL_SHADOW_EPSILON
      const hasVerticalScrollableContent = maxScrollTop > SCROLL_SHADOW_EPSILON

      const showLeftShadow = hasHorizontalScrollableContent && scrollLeft > SCROLL_SHADOW_EPSILON
      const showRightShadow =
        hasHorizontalScrollableContent && scrollLeft < maxScrollLeft - SCROLL_SHADOW_EPSILON
      const showTopShadow =
        showVerticalShadows && hasVerticalScrollableContent && scrollTop > SCROLL_SHADOW_EPSILON
      const showBottomShadow =
        showVerticalShadows &&
        hasVerticalScrollableContent &&
        scrollTop < maxScrollTop - SCROLL_SHADOW_EPSILON

      if (currentState.leftShadow !== showLeftShadow) {
        if (showLeftShadow) {
          wrapperElement.classList.add('show-left-shadow')
        } else {
          wrapperElement.classList.remove('show-left-shadow')
        }
        currentState.leftShadow = showLeftShadow
      }

      if (currentState.rightShadow !== showRightShadow) {
        if (showRightShadow) {
          wrapperElement.classList.add('show-right-shadow')
        } else {
          wrapperElement.classList.remove('show-right-shadow')
        }
        currentState.rightShadow = showRightShadow
      }

      if (currentState.topShadow !== showTopShadow) {
        if (showTopShadow) {
          wrapperElement.classList.add('show-top-shadow')
        } else {
          wrapperElement.classList.remove('show-top-shadow')
        }
        currentState.topShadow = showTopShadow
      }

      if (currentState.bottomShadow !== showBottomShadow) {
        if (showBottomShadow) {
          wrapperElement.classList.add('show-bottom-shadow')
        } else {
          wrapperElement.classList.remove('show-bottom-shadow')
        }
        currentState.bottomShadow = showBottomShadow
      }
    },
    { wait: 16 },
  )

  // Recompute shadows on scroll and on any size change that can affect
  // scroll metrics — viewport resize OR inner content resize (e.g. row
  // count, filters, virtualized rows). Observing only the viewport misses
  // content-driven changes when the viewport itself stays the same size.
  useEffect(() => {
    if (!wrapper || !scrollContainer) return

    const refresh = () => updateShadowVisibility(scrollContainer, wrapper)

    scrollContainer.addEventListener('scroll', refresh, { passive: true })

    const observer = new ResizeObserver(refresh)
    observer.observe(scrollContainer)
    const innerContent = scrollContainer.firstElementChild
    if (innerContent) {
      observer.observe(innerContent)
    }

    refresh()

    return () => {
      scrollContainer.removeEventListener('scroll', refresh)
      observer.disconnect()
    }
    // Also re-run (and eagerly refresh) when the style effect above rebuilds:
    // its cleanup resets all shadow state, so without this refresh a shadow
    // that was visible would stay hidden until the next scroll/resize event.
  }, [
    wrapper,
    scrollContainer,
    updateShadowVisibility,
    shadowColor,
    shadowBlur,
    shadowSpread,
    showVerticalShadows,
    topShadowOffset,
    leftShadowOffset,
    rightShadowOffset,
  ])

  return wrapperRef
}
