import { format } from 'date-fns'

export function formatDateTime(value: string | number | Date): string {
  const date = new Date(value)
  // 非法输入给占位符,不让 format 的 RangeError 炸掉整页渲染。
  return Number.isNaN(date.getTime()) ? '—' : format(date, 'yyyy-MM-dd HH:mm:ss')
}
