import type { ClassValue } from 'clsx'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// 保留本地实现:冻结区 components/ui/*(shadcn 生成、被 ui-lock.test.ts 的 sha256 钉死)
// 按 components.json 的 aliases.utils 从这里取 cn,项目代码也沿用同一个。
// 库版(@gedatou/cadenza-ui 的 cn)多兑现了 Base UI「className 可以是 (state) => string」
// 这条契约,返回类型会放宽成 string | ((values) => string);本地这份只收 string。
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
