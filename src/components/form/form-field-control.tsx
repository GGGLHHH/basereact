import type { AnyFieldApi } from '@tanstack/react-form'
import type { ReactNode } from 'react'
import type { AppFieldControlProps } from './index'

import { Field, FieldError, FieldLabel } from '@/components/field'

import { fieldErrors, fieldNameOf, hasNode, useFieldIds } from './index'

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

// 从 ./index 拆出来:那个文件导出的全是 hook/类型/纯函数,唯独这一个组件在,
// 于是整组导出都拦住了 Fast Refresh(react-refresh/only-export-components)。
// 组件出来单住,两边就都干净了 —— index 只剩非组件,这里只有组件。
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
    'id': controlId,
    'name': fieldNameOf(field),
    'aria-describedby': errorId,
    'aria-invalid': invalid,
  }

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
