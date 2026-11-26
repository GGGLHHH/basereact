import type { AnyFieldApi } from '@gedatou/cadenza-form'

// 服务端对某个字段的否决(404 账号不存在、409 标识被占用……)落在字段自己的错误行上,
// 而不是一闪而过的 toast:用户正要改的就是这个字段。调用方在 onSubmit 的 catch 里写
//   form.setFieldMeta(name, prev => ({ ...prev, errorMap: { ...prev.errorMap, onServer: message } }))
// (挂在 errorMap 的 onServer 槽,与 schema 校验的 onChange 槽互不覆盖;提交过之后
// cadenza-form 的展示门禁已开,立刻可见),并把本函数放进该字段的 listeners.onChange,
// 字段一改就摘掉这条。

/** 放进字段的 listeners.onChange:有服务端错误就摘掉。 */
export function clearServerError({ fieldApi }: { fieldApi: AnyFieldApi }): void {
  if (fieldApi.state.meta.errorMap.onServer !== undefined) {
    fieldApi.setMeta(prev => ({ ...prev, errorMap: { ...prev.errorMap, onServer: undefined } }))
  }
}
