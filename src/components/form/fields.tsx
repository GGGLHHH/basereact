import type { ComponentProps, ReactNode } from 'react'
import type { FormSelectFieldOption } from './index'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Field, FieldError, FieldLabel } from '@/components/field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

import { fieldErrors, hasNode, useFieldContext, useFieldIds, useFormContext } from './index'

interface BaseAppFieldProps {
  controlClassName?: string
  errorClassName?: string
  fieldClassName?: string
  label?: ReactNode
  labelEnd?: ReactNode
  labelRowClassName?: string
  labelClassName?: string
  required?: boolean
}

interface TextFieldProps
  extends
  BaseAppFieldProps,
  Omit<
    ComponentProps<typeof Input>,
      'aria-describedby' | 'aria-invalid' | 'id' | 'name' | 'onBlur' | 'onChange' | 'value'
  > {
  endAdornment?: ReactNode
  startAdornment?: ReactNode
}

interface PasswordFieldProps extends Omit<TextFieldProps, 'endAdornment' | 'type'> {
  toggleLabel?: string
}

type TextareaFieldProps = BaseAppFieldProps
  & Omit<
    ComponentProps<typeof Textarea>,
    'aria-describedby' | 'aria-invalid' | 'id' | 'name' | 'onBlur' | 'onChange' | 'value'
  >

interface SelectFieldProps
  extends
  BaseAppFieldProps,
  Omit<ComponentProps<typeof SelectTrigger>, 'aria-describedby' | 'aria-invalid' | 'children'> {
  disabled?: boolean
  options: FormSelectFieldOption[]
  placeholder: ReactNode
}

interface SubmitButtonProps extends ComponentProps<typeof Button> {
  pending?: boolean
  pendingLabel?: ReactNode
}

export function TextField({
  className,
  controlClassName,
  endAdornment,
  errorClassName,
  fieldClassName,
  label,
  labelEnd,
  labelClassName,
  labelRowClassName,
  required,
  startAdornment,
  ...props
}: TextFieldProps) {
  const field = useFieldContext<string>()
  const { controlId, errorId, invalid } = useFieldIds(field)
  const input = (
    <Input
      {...props}
      id={controlId}
      name={field.name}
      className={className}
      value={field.state.value ?? ''}
      onBlur={field.handleBlur}
      onChange={event => field.handleChange(event.target.value)}
      aria-describedby={errorId}
      aria-invalid={invalid}
      aria-required={required || undefined}
    />
  )
  const hasControlWrapper
    = (controlClassName !== undefined && controlClassName !== '')
      || hasNode(startAdornment)
      || hasNode(endAdornment)

  return (
    <Field
      data-invalid={invalid}
      className={fieldClassName}
    >
      {hasNode(label) || hasNode(labelEnd)
        ? (
            <div className={cn(hasNode(labelEnd) && 'flex items-center justify-between', labelRowClassName)}>
              {hasNode(label)
                ? (
                    <FieldLabel
                      htmlFor={controlId}
                      require={required}
                      className={labelClassName}
                    >
                      {label}
                    </FieldLabel>
                  )
                : null}
              {labelEnd}
            </div>
          )
        : null}
      {hasControlWrapper
        ? (
            <div className={cn('relative', controlClassName)}>
              {startAdornment}
              {input}
              {endAdornment}
            </div>
          )
        : (
            input
          )}
      <FieldError
        id={errorId}
        className={errorClassName}
        errors={fieldErrors(field)}
      />
    </Field>
  )
}

export function PasswordField({ className, controlClassName, toggleLabel, ...props }: PasswordFieldProps) {
  const { t } = useTranslation()
  const [isVisible, setIsVisible] = useState(false)

  return (
    <TextField
      {...props}
      className={cn('pr-10', className)}
      controlClassName={cn('relative', controlClassName)}
      endAdornment={(
        <button
          type='button'
          aria-label={toggleLabel ?? t('form.togglePassword')}
          aria-pressed={isVisible}
          className='absolute top-1/2 right-1 inline-flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-[min(var(--radius-md),10px)] text-muted-foreground transition-colors outline-none select-none hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50'
          onClick={() => setIsVisible(value => !value)}
        >
          <span
            aria-hidden='true'
            className={cn(isVisible ? 'i-lucide-eye-off' : 'i-lucide-eye', 'size-4')}
          />
        </button>
      )}
      type={isVisible ? 'text' : 'password'}
    />
  )
}

export function TextareaField({
  className,
  errorClassName,
  fieldClassName,
  label,
  labelClassName,
  required,
  ...props
}: TextareaFieldProps) {
  const field = useFieldContext<string>()
  const { controlId, errorId, invalid } = useFieldIds(field)

  return (
    <Field
      data-invalid={invalid}
      className={fieldClassName}
    >
      {hasNode(label)
        ? (
            <FieldLabel
              htmlFor={controlId}
              require={required}
              className={labelClassName}
            >
              {label}
            </FieldLabel>
          )
        : null}
      <Textarea
        {...props}
        id={controlId}
        name={field.name}
        className={className}
        value={field.state.value ?? ''}
        onBlur={field.handleBlur}
        onChange={event => field.handleChange(event.target.value)}
        aria-describedby={errorId}
        aria-invalid={invalid}
        aria-required={required || undefined}
      />
      <FieldError
        id={errorId}
        className={errorClassName}
        errors={fieldErrors(field)}
      />
    </Field>
  )
}

export function SelectField({
  className,
  disabled,
  errorClassName,
  fieldClassName,
  label,
  labelClassName,
  options,
  placeholder,
  required,
  ...triggerProps
}: SelectFieldProps) {
  const field = useFieldContext<string>()
  const { controlId, errorId, invalid } = useFieldIds(field)

  return (
    <Field
      data-invalid={invalid}
      className={fieldClassName}
    >
      {hasNode(label)
        ? (
            <FieldLabel
              htmlFor={controlId}
              require={required}
              className={labelClassName}
            >
              {label}
            </FieldLabel>
          )
        : null}
      <Select
        disabled={disabled}
        items={options}
        value={field.state.value ?? ''}
        onValueChange={value => field.handleChange(value ?? '')}
        onOpenChange={(open) => {
          // Closing the popup is the select's "blur": marks isBlurred so
          // errors surface like the text fields' onBlur does.
          if (!open) {
            field.handleBlur()
          }
        }}
      >
        <SelectTrigger
          {...triggerProps}
          id={controlId}
          className={cn('w-full', className)}
          onBlur={field.handleBlur}
          aria-describedby={errorId}
          aria-invalid={invalid}
          aria-required={required || undefined}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map(option => (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldError
        id={errorId}
        className={errorClassName}
        errors={fieldErrors(field)}
      />
    </Field>
  )
}

export function SubmitButton({ children, disabled, pending, pendingLabel, ...props }: SubmitButtonProps) {
  const form = useFormContext()

  return (
    <form.Subscribe selector={state => state.isSubmitting}>
      {isSubmitting => (
        <Button
          // base-ui Button defaults native buttons to type='button'; a submit
          // button must opt back in or clicks won't submit the form.
          type='submit'
          {...props}
          disabled={disabled || pending || isSubmitting}
        >
          {(pending || isSubmitting) && hasNode(pendingLabel) ? pendingLabel : children}
        </Button>
      )}
    </form.Subscribe>
  )
}
