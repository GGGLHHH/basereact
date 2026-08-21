import type { AnyFieldApi, UpdateMetaOptions } from '@tanstack/react-form'
import type { ReactNode, SubmitEvent } from 'react'
import {

  createFormHook,
  createFormHookContexts,

} from '@tanstack/react-form'
import { useSelector as useFormStore } from '@tanstack/react-store'
import { useId } from 'react'

// 字段组件住 ./fields:它们和这里导出的 hook/纯函数放同一个文件时,整组非组件导出
// 都会拦住 Fast Refresh(react-refresh/only-export-components)。
// 两边确实互相 import,但只在函数体内取值(顶层不读对方的导出),循环是安全的。
import { PasswordField, SelectField, SubmitButton, TextareaField, TextField } from './fields'

export interface FormFieldError { message?: string }

export { useFormStore }

export interface FormSelectFieldOption {
  disabled?: boolean
  label: ReactNode
  value: string
}

interface FormSubmitHandlerOptions {
  focusFirstError?: boolean
}

export interface AppFieldControlProps {
  'aria-describedby': string
  'aria-invalid': boolean
  'id': string
  'name': string
}

const INVALID_FORM_CONTROL_SELECTOR
  = '[aria-invalid="true"]:not(:disabled):not([aria-disabled="true"])'

export const { fieldContext, formContext, useFieldContext, useFormContext } = createFormHookContexts()

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
  // 直接取 window.requestAnimationFrame 会让方法与 window 分离(this 丢失)。
  // 包一层调用点即可;rAF 缺席时退 setTimeout —— 它需要显式延时参数。
  const schedule = (callback: () => void): void => {
    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(callback)
      return
    }
    window.setTimeout(callback, 0)
  }

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

/**
 * `AnyFieldApi` 的泛型被擦成 any,`name` 也跟着失去类型 —— 但它在运行时始终是
 * 字段路径字符串。收口在这里,五个调用点就不必各自断言。
 */
export function fieldNameOf(field: AnyFieldApi): string {
  return String(field.name)
}

/**
 * ReactNode 不能直接当条件用(0 会渲染成 "0",却是 falsy)。这里保留原先
 * truthiness 的全部语义,只是写成显式的。
 */
export function hasNode(node: ReactNode): boolean {
  return node !== undefined && node !== null && node !== false && node !== '' && node !== 0
}

export function fieldErrorId(fieldName: string): string {
  return `${fieldName.replaceAll(/[^\w-]/g, '-')}-error`
}

export function fieldInvalidState(field: AnyFieldApi): {
  errorId: string
  invalid: boolean
} {
  return {
    errorId: fieldErrorId(fieldNameOf(field)),
    invalid: fieldHasError(field),
  }
}

export function fieldControlProps(field: AnyFieldApi): AppFieldControlProps {
  const { errorId, invalid } = fieldInvalidState(field)

  const name = fieldNameOf(field)

  return {
    'id': name,
    'name': name,
    'aria-describedby': errorId,
    'aria-invalid': invalid,
  }
}

/**
 * Instance-scoped ids via useId so two forms sharing a field name on one page
 * never collide on id/htmlFor/aria-describedby. The exported name-based helpers
 * (fieldControlProps/fieldInvalidState) stay for non-component callers.
 */
export function useFieldIds(field: AnyFieldApi): {
  controlId: string
  errorId: string
  invalid: boolean
} {
  const reactId = useId()

  const name = fieldNameOf(field)

  return {
    controlId: `${reactId}${name}`,
    errorId: `${reactId}${fieldErrorId(name)}`,
    invalid: fieldHasError(field),
  }
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
    typeof error === 'object'
    && error !== null
    && 'message' in error
    && typeof (error as FormFieldError).message === 'string'
  )
}
