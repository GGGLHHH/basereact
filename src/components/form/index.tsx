import {
  createFormHook,
  createFormHookContexts,
  type AnyFieldApi,
  type UpdateMetaOptions,
} from '@tanstack/react-form'
import { useSelector as useFormStore } from '@tanstack/react-store'
import type { ComponentProps, ReactNode, SubmitEvent } from 'react'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/field'
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

export type FormFieldError = { message?: string }

export { useFormStore }

export interface FormSelectFieldOption {
  disabled?: boolean
  label: ReactNode
  value: string
}

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

type TextareaFieldProps = BaseAppFieldProps &
  Omit<
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

interface FormSubmitHandlerOptions {
  focusFirstError?: boolean
}

export interface AppFieldControlProps {
  'aria-describedby': string
  'aria-invalid': boolean
  id: string
  name: string
}

interface FormFieldControlProps {
  afterError?: ReactNode
  children: (props: {
    controlProps: AppFieldControlProps
    errorId: string
    invalid: boolean
  }) => ReactNode
  errorClassName?: string
  field: AnyFieldApi
  fieldClassName?: string
  label?: ReactNode
  labelClassName?: string
  required?: boolean
}

const INVALID_FORM_CONTROL_SELECTOR =
  '[aria-invalid="true"]:not(:disabled):not([aria-disabled="true"])'

const { fieldContext, formContext, useFieldContext, useFormContext } = createFormHookContexts()

export const { useAppForm, withForm } = createFormHook({
  fieldComponents: {
    PasswordField,
    SelectField,
    TextareaField,
    TextField,
  },
  formComponents: {
    SubmitButton,
  },
  fieldContext,
  formContext,
})

export const silentFieldUpdateOptions: UpdateMetaOptions = {
  dontRunListeners: true,
  dontUpdateMeta: true,
  dontValidate: true,
}

export const validatingFieldUpdateOptions: UpdateMetaOptions = {
  dontRunListeners: true,
}

export function formSubmitHandler(
  handleSubmit: () => Promise<void> | void,
  { focusFirstError = true }: FormSubmitHandlerOptions = {},
) {
  return (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const form = event.currentTarget

    void Promise.resolve(handleSubmit())
      .catch((error: unknown) => {
        // form-core re-throws onSubmit rejections; without this catch they
        // surface as unhandled promise rejections with no user-facing path.
        console.error(error)
      })
      .finally(() => {
        if (focusFirstError) {
          focusFirstInvalidControl(form)
        }
      })
  }
}

function focusFirstInvalidControl(form: HTMLFormElement) {
  const schedule = window.requestAnimationFrame ?? window.setTimeout

  schedule(() => {
    if (!form.isConnected) {
      return
    }

    const invalidControl = form.querySelector<HTMLElement>(INVALID_FORM_CONTROL_SELECTOR)
    invalidControl?.focus()
  })
}

export function fieldErrors(field: AnyFieldApi): FormFieldError[] {
  if (!fieldShouldShowError(field)) {
    return []
  }

  return normalizeFieldErrors(field.state.meta.errors)
}

export function fieldHasError(field: AnyFieldApi): boolean {
  return fieldErrors(field).length > 0
}

export function fieldErrorMessage(field: AnyFieldApi): string | undefined {
  return fieldErrors(field)[0]?.message
}

export function fieldShouldShowError(field: AnyFieldApi): boolean {
  // 纯 tab 穿过(blur 但没输入过)不算:isDirty 是 sticky 的,输过又清空仍会报。
  const { isBlurred, isDirty } = field.state.meta
  return (isDirty && isBlurred) || field.form.state.submissionAttempts > 0
}

export function fieldErrorId(fieldName: string): string {
  return `${fieldName.replaceAll(/[^a-zA-Z0-9_-]/g, '-')}-error`
}

export function fieldInvalidState(field: AnyFieldApi): {
  errorId: string
  invalid: boolean
} {
  return {
    errorId: fieldErrorId(field.name),
    invalid: fieldHasError(field),
  }
}

export function fieldControlProps(field: AnyFieldApi): AppFieldControlProps {
  const { errorId, invalid } = fieldInvalidState(field)

  return {
    id: field.name,
    name: field.name,
    'aria-describedby': errorId,
    'aria-invalid': invalid,
  }
}

/**
 * Instance-scoped ids via useId so two forms sharing a field name on one page
 * never collide on id/htmlFor/aria-describedby. The exported name-based helpers
 * (fieldControlProps/fieldInvalidState) stay for non-component callers.
 */
function useFieldIds(field: AnyFieldApi): {
  controlId: string
  errorId: string
  invalid: boolean
} {
  const reactId = useId()

  return {
    controlId: `${reactId}${field.name}`,
    errorId: `${reactId}${fieldErrorId(field.name)}`,
    invalid: fieldHasError(field),
  }
}

export function FormFieldControl({
  afterError,
  children,
  errorClassName,
  field,
  fieldClassName,
  label,
  labelClassName,
  required,
}: FormFieldControlProps) {
  const { controlId, errorId, invalid } = useFieldIds(field)
  const controlProps: AppFieldControlProps = {
    id: controlId,
    name: field.name,
    'aria-describedby': errorId,
    'aria-invalid': invalid,
  }

  return (
    <Field
      data-invalid={invalid}
      className={fieldClassName}
    >
      {label ? (
        <FieldLabel
          htmlFor={controlId}
          require={required}
          className={labelClassName}
        >
          {label}
        </FieldLabel>
      ) : null}
      {children({
        controlProps,
        errorId,
        invalid,
      })}
      <FieldError
        id={errorId}
        className={errorClassName}
        errors={fieldErrors(field)}
      />
      {afterError}
    </Field>
  )
}

export function normalizeFieldErrors(errors: unknown[]): FormFieldError[] {
  return errors.flatMap((error) => {
    if (Array.isArray(error)) {
      return normalizeFieldErrors(error)
    }

    if (typeof error === 'string') {
      return [{ message: error }]
    }

    if (isErrorWithMessage(error)) {
      return [{ message: error.message }]
    }

    return []
  })
}

function isErrorWithMessage(error: unknown): error is FormFieldError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as FormFieldError).message === 'string'
  )
}

function TextField({
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
      onChange={(event) => field.handleChange(event.target.value)}
      aria-describedby={errorId}
      aria-invalid={invalid}
      aria-required={required || undefined}
    />
  )
  const hasControlWrapper = Boolean(controlClassName || startAdornment || endAdornment)

  return (
    <Field
      data-invalid={invalid}
      className={fieldClassName}
    >
      {label || labelEnd ? (
        <div className={cn(labelEnd && 'flex items-center justify-between', labelRowClassName)}>
          {label ? (
            <FieldLabel
              htmlFor={controlId}
              require={required}
              className={labelClassName}
            >
              {label}
            </FieldLabel>
          ) : null}
          {labelEnd}
        </div>
      ) : null}
      {hasControlWrapper ? (
        <div className={cn('relative', controlClassName)}>
          {startAdornment}
          {input}
          {endAdornment}
        </div>
      ) : (
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

function PasswordField({ className, controlClassName, toggleLabel, ...props }: PasswordFieldProps) {
  const { t } = useTranslation()
  const [isVisible, setIsVisible] = useState(false)

  return (
    <TextField
      {...props}
      className={cn('pr-10', className)}
      controlClassName={cn('relative', controlClassName)}
      endAdornment={
        <button
          type='button'
          aria-label={toggleLabel ?? t('form.togglePassword')}
          aria-pressed={isVisible}
          className='absolute top-1/2 right-1 inline-flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-[min(var(--radius-md),10px)] text-muted-foreground transition-colors outline-none select-none hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50'
          onClick={() => setIsVisible((value) => !value)}
        >
          <span
            aria-hidden='true'
            className={cn(isVisible ? 'i-lucide-eye-off' : 'i-lucide-eye', 'size-4')}
          />
        </button>
      }
      type={isVisible ? 'text' : 'password'}
    />
  )
}

function TextareaField({
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
      {label ? (
        <FieldLabel
          htmlFor={controlId}
          require={required}
          className={labelClassName}
        >
          {label}
        </FieldLabel>
      ) : null}
      <Textarea
        {...props}
        id={controlId}
        name={field.name}
        className={className}
        value={field.state.value ?? ''}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
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

function SelectField({
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
      {label ? (
        <FieldLabel
          htmlFor={controlId}
          require={required}
          className={labelClassName}
        >
          {label}
        </FieldLabel>
      ) : null}
      <Select
        disabled={disabled}
        items={options}
        value={field.state.value ?? ''}
        onValueChange={(value) => field.handleChange(value ?? '')}
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
          {options.map((option) => (
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

function SubmitButton({ children, disabled, pending, pendingLabel, ...props }: SubmitButtonProps) {
  const form = useFormContext()

  return (
    <form.Subscribe selector={(state) => state.isSubmitting}>
      {(isSubmitting) => (
        <Button
          // base-ui Button defaults native buttons to type='button'; a submit
          // button must opt back in or clicks won't submit the form.
          type='submit'
          {...props}
          disabled={disabled || pending || isSubmitting}
        >
          {(pending || isSubmitting) && pendingLabel ? pendingLabel : children}
        </Button>
      )}
    </form.Subscribe>
  )
}
