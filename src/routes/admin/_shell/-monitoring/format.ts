// 监控页的数字 / 时间格式化(等宽数字展示)。

const NUM = new Intl.NumberFormat()
const HM = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
const HMS = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

export function num(n: number): string {
  return NUM.format(n)
}

/** 毫秒:<10 保留一位小数,其余取整;没有样本显示 "—"。 */
export function ms(v: number | null | undefined): string {
  if (v == null)
    return '—'
  return v < 10 ? `${v.toFixed(1)} ms` : `${NUM.format(Math.round(v))} ms`
}

export function pct(x: number, digits = 1): string {
  return `${(x * 100).toFixed(digits)}%`
}

export function bytes(n: number | null | undefined): string {
  if (n == null)
    return '—'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let v = n
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i += 1
  }
  return `${v < 10 && i > 0 ? v.toFixed(1) : Math.round(v)} ${units[i]}`
}

/** 时长(秒)→ 紧凑写法:2d 3h / 3h 5m / 5m 3s / 42s。 */
export function duration(secs: number): string {
  const s = Math.max(0, Math.floor(secs))
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (d > 0)
    return `${d}d ${h}h`
  if (h > 0)
    return `${h}h ${m}m`
  if (m > 0)
    return `${m}m ${s % 60}s`
  return `${s}s`
}

const DAY_TIME = new Intl.DateTimeFormat(undefined, {
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const STAMP = new Intl.DateTimeFormat(undefined, {
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

/** MM-DD HH:MM:SS —— 日志时间。 */
export function stamp(iso: string): string {
  return STAMP.format(new Date(iso))
}

/** MM-DD HH:MM —— 跨天的横轴。 */
export function dayTime(iso: string): string {
  return DAY_TIME.format(new Date(iso))
}

export function hm(iso: string): string {
  return HM.format(new Date(iso))
}

export function hms(iso: string): string {
  return HMS.format(new Date(iso))
}

/** 距现在多少秒(时钟偏差导致的负数按 0)。 */
export function secondsSince(iso: string, now = Date.now()): number {
  return Math.max(0, (now - Date.parse(iso)) / 1000)
}
