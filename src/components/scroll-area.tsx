import * as React from 'react'

import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area'

import { cn } from '@/lib/utils'
import { ScrollBar } from '@/components/ui/scroll-area'

// Project scroll-area wrapper. `@/components/ui/scroll-area` stays byte-identical to the official
// shadcn base-vega registry source; the project's orientation / showScrollbars / viewport* API
// lives here. ScrollBar is re-exported unchanged from the registry file.
export { ScrollBar } from '@/components/ui/scroll-area'

function ScrollArea({
  className,
  children,
  orientation = 'vertical',
  showScrollbars = true,
  viewportClassName,
  viewportRef,
  viewportStyle,
  ...props
}: ScrollAreaPrimitive.Root.Props & {
  orientation?: 'vertical' | 'horizontal' | 'both'
  showScrollbars?: boolean
  viewportClassName?: string
  viewportRef?: React.Ref<HTMLDivElement>
  viewportStyle?: React.CSSProperties
}) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot='scroll-area'
      data-orientation={orientation}
      className={cn('relative', className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        ref={viewportRef}
        data-slot='scroll-area-viewport'
        className={cn(
          'size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1',
          viewportClassName,
        )}
        style={viewportStyle}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      {(orientation === 'vertical' || orientation === 'both') && (
        <ScrollBar
          orientation='vertical'
          className={cn(!showScrollbars && 'hidden')}
        />
      )}
      {(orientation === 'horizontal' || orientation === 'both') && (
        <ScrollBar
          orientation='horizontal'
          className={cn(!showScrollbars && 'hidden')}
        />
      )}
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

export { ScrollArea }
