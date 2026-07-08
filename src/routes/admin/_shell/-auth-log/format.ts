// 时间/数字格式化(mono 数据展示)。tape/表/轴共用。

const HMS = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})
const HM = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })

/** HH:MM:SS —— tape 行。 */
export function hms(iso: string): string {
  return HMS.format(new Date(iso))
}

/** HH:MM —— 轴刻度 / 表。 */
export function hm(iso: string): string {
  return HM.format(new Date(iso))
}

/** 相对现在的粗粒度时长(表次要列)。 */
export function ago(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000))
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  return `${Math.floor(s / 3600)}h`
}

const NUM = new Intl.NumberFormat()
export function num(n: number): string {
  return NUM.format(n)
}

export function pct(x: number, digits = 1): string {
  return `${(x * 100).toFixed(digits)}%`
}

export function signedPct(x: number): string {
  return `${x >= 0 ? '+' : ''}${(x * 100).toFixed(1)}%`
}
