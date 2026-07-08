import { type ComponentProps } from 'react'

import { cn } from '@/lib/utils'
import {
  DropdownMenuContent as UIDropdownMenuContent,
  DropdownMenuSubContent as UIDropdownMenuSubContent,
} from '@/components/ui/dropdown-menu'

// Project dropdown wrapper. `@/components/ui/dropdown-menu` stays byte-identical to the vendored
// base source. This wrapper keeps one project default: menu content lays its items out in a flex
// column with gap-1, so adjacent items never sit flush (e.g. a hovered item touching a
// persistently-active one). The base popup is a plain block, so gap needs the flex column to bite.
// Callers can still pass their own gap-*/layout. All other parts are re-exported unchanged.
export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu'

function DropdownMenuContent({
  className,
  ...props
}: ComponentProps<typeof UIDropdownMenuContent>) {
  return (
    <UIDropdownMenuContent
      className={cn('flex flex-col gap-1', className)}
      {...props}
    />
  )
}

function DropdownMenuSubContent({
  className,
  ...props
}: ComponentProps<typeof UIDropdownMenuSubContent>) {
  return (
    <UIDropdownMenuSubContent
      className={cn('flex flex-col gap-1', className)}
      {...props}
    />
  )
}

export { DropdownMenuContent, DropdownMenuSubContent }
