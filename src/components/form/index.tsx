import type { AnyFieldApi } from '@gedatou/cadenza-form'
import type { ReactNode } from 'react'
import { createFormHook, fieldErrorId, fieldHasError } from '@gedatou/cadenza-form'
import { useId } from 'react'

// 字段组件住 ./fields:它们和这里导出的 hook/纯函数放同一个文件时,整组非组件导出
// 都会拦住 Fast Refresh(react-refresh/only-export-components)。
// 两边确实互相 import,但只在函数体内取值(顶层不读对方的导出),循环是安全的。
import { PasswordField, SelectField, SubmitButton, TextField } from './fields'

// 已知缺口(库侧):cadenza 的提交管线链尾是 `void Promise…then().finally()`,没有
// `.catch()`,所以 onSubmit 抛出的东西会逃逸成无处理的 promise rejection。本地原实现
// 有这层网。在这里补不回来 —— 管线的 promise 在库内部,外面够不着;把 form 包一层
// Proxy 换掉 handleSubmit 也不行,库用 WeakSet 按 form 实例记「是否已挂迟到校验订阅」,
// 每次渲染换个 Proxy 会让它每渲染一次就多订阅一次。所以目前的做法是各调用点自己
// try/catch(全部 6 处都做了),根治要回 cadenza 加那行 catch。
//
// 校验门禁、错误归一化、id 生成、提交管线全部来自 @gedatou/cadenza-form ——
// 本地原实现与它逐个函数体等价(门禁同为 (isDirty && isBlurred) || submissionAttempts > 0,
// fieldErrorId 同为 replaceAll(/[^\w-]/g,'-')+'-error')。库版是超集:
// fieldControlProps 多一条从 schema 空值探针推导出的 aria-required,
// formProps 还带 noValidate + revealFieldErrors + 迟到字段补校验。
// 只再导出确有消费者的:formProps 是 7 个表单页的入口。其余 helper
// (fieldControlProps / fieldInvalidState / fieldShouldShowError / normalizeFieldErrors /
// fieldErrorId 以及两个类型)本仓库无人使用,需要时直接从 @gedatou/cadenza-form 取 ——
// 转手一道只是多一层要维护的 API 面。
export { formProps } from '@gedatou/cadenza-form'

export interface FormSelectFieldOption {
  disabled?: boolean
  label: ReactNode
  value: string
}

export const { useAppForm } = createFormHook({
  fieldComponents: {
    PasswordField,
    SelectField,
    TextField,
  },
  formComponents: {
    SubmitButton,
  },
})

/**
 * `AnyFieldApi` 的泛型被擦成 any,`name` 也跟着失去类型 —— 但它在运行时始终是
 * 字段路径字符串。收口在这里,useFieldIds 就不必各自断言。
 */
function fieldNameOf(field: AnyFieldApi): string {
  return String(field.name)
}

/**
 * ReactNode 不能直接当条件用(0 会渲染成 "0",却是 falsy)。这里保留原先
 * truthiness 的全部语义,只是写成显式的。
 */
export function hasNode(node: ReactNode): boolean {
  return node !== undefined && node !== null && node !== false && node !== '' && node !== 0
}

/**
 * Instance-scoped ids via useId so two forms sharing a field name on one page
 * never collide on id/htmlFor/aria-describedby.
 *
 * 这是 cadenza-form 没有的一件事:它的 fieldControlProps 直接拿裸 field.name 当
 * DOM id。所以不是替换关系而是叠加 —— 需要 aria-required 推导时写成
 * `{...fieldControlProps(field), id: controlId, 'aria-describedby': errorId}`。
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
