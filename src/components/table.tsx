import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

// Project table wrapper. `@/components/ui/table` stays byte-identical to the official shadcn
// base-vega registry source. This wrapper keeps the project's table extensions:
//  - Table accepts a `containerClassName` for the scroll container.
//  - Header/row borders use the `border-border` token and rows omit the registry's
//    has-aria-expanded row highlight.
// All other table parts are re-exported unchanged.
export { TableBody, TableFooter, TableHead, TableCell, TableCaption } from '@/components/ui/table'

function Table({
  className,
  containerClassName,
  ...props
}: ComponentProps<'table'> & { containerClassName?: string }) {
  return (
    <div
      data-slot='table-container'
      className={cn('relative w-full overflow-x-auto', containerClassName)}
    >
      <table
        data-slot='table'
        className={cn('w-full caption-bottom text-sm', className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: ComponentProps<'thead'>) {
  return (
    <thead
      data-slot='table-header'
      className={cn('[&_tr]:border-b [&_tr]:border-border', className)}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: ComponentProps<'tr'>) {
  return (
    <tr
      data-slot='table-row'
      className={cn(
        'border-b border-border transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted',
        className,
      )}
      {...props}
    />
  )
}

export { Table, TableHeader, TableRow }
