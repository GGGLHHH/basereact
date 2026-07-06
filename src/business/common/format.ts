// 空/null 字段统一回占位符,跨 business 表格复用。
export const dash = (value: string | null | undefined) => value ?? '—'
