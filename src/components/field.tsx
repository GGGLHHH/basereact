import type { FieldGroupProps } from '@gedatou/cadenza-ui'
import type { ComponentProps } from 'react'

import { FieldGroup as CadenzaFieldGroup } from '@gedatou/cadenza-ui'
import { cn } from '@/lib/utils'

// Project field wrapper over @gedatou/cadenza-ui. Two project extensions survive the move:
//  - FieldError reserves vertical space (stays mounted, min-h-5, invisible when empty) so the
//    form layout does not jump as validation messages appear/disappear. cadenza's own FieldError
//    returns null when empty, which would make every message toggle reflow the form.
//  - FieldGroup defaults to gap-0: with FieldError always reserving its own vertical space, the
//    library's gap would double the spacing between fields. Callers can still pass a `gap-*`.
//    These two are one decision, not two — change either and the other must follow.
// The required asterisk is no longer local: cadenza's FieldLabel/FieldLegend/FieldTitle carry a
// `required` prop of their own (aria-hidden mark, same semantics), so the wrapper is gone and
// call sites pass `required` instead of the old `require` alias.
export {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from '@gedatou/cadenza-ui'

function FieldGroup({ className, ...props }: FieldGroupProps) {
  return (
    <CadenzaFieldGroup
      className={cn('gap-0', className)}
      {...props}
    />
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
  const firstErrorMessage
    = errors?.find(error => error?.message !== undefined && error.message !== '')?.message ?? null
  // "Provided" = a node worth rendering; the falsy ones ('', 0, false, null, undefined) fall
  // through to the error message, exactly as the previous `||` did.
  const hasChildren
    = children !== undefined
      && children !== null
      && children !== false
      && children !== ''
      && children !== 0
  const content = hasChildren ? children : firstErrorMessage

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

export { FieldError, FieldGroup }
