import type { ClassValue } from 'clsx'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// 保留本地实现,不再导出 —— 换成 @gedatou/cadenza-ui 的 cn 会打不过冻结区:
// 库版把 Base UI 的「className 可以是 (state) => string」这条契约兑现了,检测到
// 函数入参就把返回类型放宽成 string | ((values) => string)。而 ui/accordion.tsx:61
// 与 ui/combobox.tsx:64 正是把 Base UI props 的 className 原样喂进 cn、再塞回一个
// 只收 string 的槽位 —— 这两个文件被 ui-lock.test.ts 的 sha256 钉死,改不了。
// (顺带说明这两处有个潜伏 bug:调用方传函数形式 className 会被 clsx 静默吞掉。
//  库版会报错而不是吞——等哪天冻结区解冻,换过去就能暴露它。)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
