// 实时:SSE(/admin/auth/auth-events/stream)。EventSource 同源走 httponly cookie 鉴权,自动重连。
// 新事件置顶 tape;KPI/图表/分布 = stats 快照 + 快照之后的 SSE 事件逐条叠加(见 useLiveStats)。

import { useEffect, useMemo, useRef, useState } from 'react'

import type { AuthEvent } from './types'

import { toAuthEvent } from './data'

import type { MappedStats } from './data'

import type { AuthEventRow } from '#/generated/api-types'

import { streamAuthEvents } from '#/generated/api'
import { API_BASE_URL } from '#/lib/api-client'

// path 来自生成的 path builder(同 profile.ts 的 buildSetUserAvatarPath 套路)——
// EventSource 要的是纯 URL 不是 fetch,绕过 fetch 客户端但仍吃后端真路径,不手写字面量。
const STREAM_URL = `${API_BASE_URL}/${streamAuthEvents()}`
const CAP = 120

export interface AuthEventStream {
  /** 自连接以来收到的事件,新的在前,封顶 CAP 条(见 useLiveStats 的说明)。 */
  events: AuthEvent[]
  freshId: string | null
  connected: boolean
  paused: boolean
  togglePaused: () => void
  /** 连续失败次数,每次成功 open 清零——EventSource 原生 API 拿不到响应状态码,分不清
   *  网络抖一下还是会话真死了,页面拿这个数去判断"该不该借道 ky 探一次会话"。 */
  errorStreak: number
}

export function useAuthEventStream(): AuthEventStream {
  const [events, setEvents] = useState<AuthEvent[]>([])
  const [connected, setConnected] = useState(false)
  const [paused, setPaused] = useState(false)
  const [errorStreak, setErrorStreak] = useState(0)
  const freshId = useRef<string | null>(null)

  useEffect(() => {
    if (paused) {
      return
    }
    const es = new EventSource(STREAM_URL, { withCredentials: true })
    es.onopen = () => {
      setConnected(true)
      setErrorStreak(0)
    }
    es.onerror = () => {
      setConnected(false) // EventSource 自动重连
      setErrorStreak((n) => n + 1)
    }
    es.addEventListener('auth_event', (e) => {
      let row: AuthEventRow
      try {
        row = JSON.parse((e as MessageEvent).data) as AuthEventRow
      } catch {
        return
      }
      const ev = toAuthEvent(row)
      freshId.current = ev.id
      setEvents((prev) => [ev, ...prev].slice(0, CAP))
    })
    return () => es.close()
  }, [paused])

  return {
    events,
    freshId: freshId.current,
    connected,
    paused,
    togglePaused: () => setPaused((p) => !p),
    errorStreak,
  }
}

// 触发防抖(带 maxWait,非纯 debounce):静默期内合并多条更新,但持续来事件时也保证每
// `ms` 至少刷新一次——纯 debounce 会在持续攻击(登录失败连环炸)时被不断重置、一直不触发,
// 安全大屏最不该在真出事的时候画面冻住。tape 不吃这层,单独直接用 stream.events(见
// auth-log.tsx)——新事件要立刻上 tape,这层只挡"重算图表/分布"这种贵操作的触发频率。
function useThrottledValue<T>(value: T, ms: number): T {
  const [throttled, setThrottled] = useState(value)
  const lastAt = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => {
    const wait = Math.max(0, ms - (Date.now() - lastAt.current))
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      lastAt.current = Date.now()
      setThrottled(value)
    }, wait)
    return () => clearTimeout(timer.current)
  }, [value, ms])
  return throttled
}

/** KPI/图表/分布这层重算触发用——tape 不要用这个,见上面注释。 */
export function useThrottledEvents(events: AuthEvent[], ms = 500): AuthEvent[] {
  return useThrottledValue(events, ms)
}

function hourStart(iso: string): number {
  const d = new Date(iso)
  d.setUTCMinutes(0, 0, 0)
  return d.getTime()
}

// 事件折进快照:activity 命中所在小时桶就 +1,没有就新开一桶(边界很少见——仪表盘一般
// 开着的时候"现在"这小时桶后端已经给了);reasons/types/topIps 同理,键存在就加,不存在
// 就插入一条 count=1;topIps 每次重新按 failures desc, total desc 排序、封顶 6 条,跟后端
// 排序规则一致。
function foldEvent(acc: MappedStats, e: AuthEvent): MappedStats {
  const fail = e.outcome === 'failure'
  const h = hourStart(e.occurredAt)
  let hit = false
  const activity = acc.activity.map((b) => {
    if (hourStart(b.t) !== h) {
      return b
    }
    hit = true
    return { ...b, success: b.success + (fail ? 0 : 1), failure: b.failure + (fail ? 1 : 0) }
  })
  if (!hit) {
    activity.push({ t: e.occurredAt, success: fail ? 0 : 1, failure: fail ? 1 : 0 })
  }

  let reasons = acc.reasons
  if (fail && e.failureReason) {
    const i = reasons.findIndex((r) => r.key === e.failureReason)
    reasons =
      i >= 0
        ? reasons.map((r, idx) => (idx === i ? { ...r, count: r.count + 1 } : r))
        : [...reasons, { key: e.failureReason, count: 1 }]
  }

  const ti = acc.types.findIndex((t) => t.key === e.eventType)
  const types =
    ti >= 0
      ? acc.types.map((t, idx) => (idx === ti ? { ...t, count: t.count + 1 } : t))
      : [...acc.types, { key: e.eventType, count: 1 }]

  const ii = acc.topIps.findIndex((i) => i.ip === e.ip)
  const topIps = (
    ii >= 0
      ? acc.topIps.map((i, idx) =>
          idx === ii ? { ...i, total: i.total + 1, failures: i.failures + (fail ? 1 : 0) } : i,
        )
      : [...acc.topIps, { ip: e.ip, total: 1, failures: fail ? 1 : 0 }]
  )
    .sort((a, b) => b.failures - a.failures || b.total - a.total)
    .slice(0, 6)

  const totalEvents = acc.kpi.totalEvents + 1
  const failedCount = acc.kpi.failedCount + (fail ? 1 : 0)
  return {
    kpi: {
      ...acc.kpi,
      totalEvents,
      failedCount,
      successRate: totalEvents ? (totalEvents - failedCount) / totalEvents : 1,
    },
    activity,
    reasons,
    types,
    topIps,
  }
}

// KPI/图表/分布 = stats 快照 + 快照之后到达的 SSE 事件逐条折进去。用 occurredAt 而非"连接
// 后收到的全部事件"来分界:stats 偶尔因窗口重新聚焦被 react-query 悄悄重取时,base 会前移,
// 这样重取之前已经算过的事件不会被二次叠加。
// uniqueIps 不参与折算——base 只给计数不给具体 IP 集合,没法去重,维持 stats 快照时的值,
// 下次快照刷新自然更新。ponytail: 需要精确可加一个后端"新增独立 IP"字段。
export function useLiveStats(base: MappedStats, baseAt: number, events: AuthEvent[]): MappedStats {
  return useMemo(() => {
    const fresh = events.filter((e) => new Date(e.occurredAt).getTime() > baseAt).reverse()
    return fresh.reduce(foldEvent, base)
  }, [base, baseAt, events])
}
