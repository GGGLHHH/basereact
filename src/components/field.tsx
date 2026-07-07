import { type ComponentProps } from 'react'

import { cn } from '@/lib/utils'
import { FieldGroup as UIFieldGroup, FieldLabel as UIFieldLabel } from '@/components/ui/field'

// Project field wrapper. `@/components/ui/field` stays byte-identical to the official shadcn
// base-vega registry source. This wrapper keeps three project extensions:
//  - FieldLabel gains `require`/`required` props that append a destructive `*` RequiredMark.
//  - FieldError reserves vertical space (stays mounted, min-h-5, invisible when empty) so the
//    form layout does not jump as validation messages appear/disappear.
//  - FieldGroup defaults to gap-0: with FieldError always reserving its own vertical space, the
//    base gap-7 would double the spacing between fields. Callers can still pass a `gap-*`.
// All other field parts are re-exported unchanged.
export {
  Field,
  FieldDescription,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldContent,
  FieldTitle,
} from '@/components/ui/field'

function FieldGroup({ className, ...props }: ComponentProps<typeof UIFieldGroup>) {
  return (
    <UIFieldGroup
      className={cn('gap-0', className)}
      {...props}
    />
  )
}

function RequiredMark() {
  return (
    <span
      aria-hidden='true'
      className='ml-0.5 text-destructive'
    >
      *
    </span>
  )
}

type FieldLabelProps = ComponentProps<typeof UIFieldLabel> & {
  require?: boolean
  required?: boolean
}

function FieldLabel({ children, require: requireMark, required, ...props }: FieldLabelProps) {
  const showRequiredMark = requireMark ?? required

  return (
    <UIFieldLabel {...props}>
      {children}
      {showRequiredMark ? <RequiredMark /> : null}
    </UIFieldLabel>
  )
}

function FieldError({
  className,
  children,
  errors,
  ...props
}: ComponentProps<'div'> & {
  errors?: Array<{ message?: string } | undefined>
}) {
  // Only ever surface a single message: render explicit children if provided, otherwise the
  // first error that carries a message. Extra errors are intentionally collapsed to one line.
  const content = children ? children : (errors?.find((error) => error?.message)?.message ?? null)

  const hasContent = content !== null && content !== undefined && content !== ''

  return (
    <div
      role={hasContent ? 'alert' : undefined}
      aria-hidden={!hasContent}
      data-slot='field-error'
      className={cn(
        '-mt-2 min-h-5 text-xs/5 font-normal text-destructive',
        !hasContent && 'invisible',
        className,
      )}
      {...props}
    >
      {hasContent ? content : ' '}
    </div>
  )
}

export { FieldError, FieldGroup, FieldLabel }
