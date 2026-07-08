// 实时:SSE(/admin/auth/auth-events/stream)。EventSource 同源走 httponly cookie 鉴权,自动重连。
// 新事件置顶 tape + 递增 live 计数;KPI 显示 = stats 基值 + 自上次 stats 拉取以来的 live 增量。

import { useEffect, useRef, useState } from 'react'

import type { AuthEvent, Kpi } from './types'

import { toAuthEvent } from './data'

import type { AuthEventRow } from '#/generated/api-types'

import { streamAuthEvents } from '#/generated/api'
import { API_BASE_URL } from '#/lib/api-client'

// path 来自生成的 path builder(同 profile.ts 的 buildSetUserAvatarPath 套路)——
// EventSource 要的是纯 URL 不是 fetch,绕过 fetch 客户端但仍吃后端真路径,不手写字面量。
const STREAM_URL = `${API_BASE_URL}/${streamAuthEvents()}`
const CAP = 120

export interface AuthEventStream {
  events: AuthEvent[]
  freshId: string | null
  connected: boolean
  paused: boolean
  togglePaused: () => void
  /** 自连接以来累计(供 KPI 叠加)。 */
  liveCount: { total: number; failed: number }
}

export function useAuthEventStream(): AuthEventStream {
  const [events, setEvents] = useState<AuthEvent[]>([])
  const [connected, setConnected] = useState(false)
  const [paused, setPaused] = useState(false)
  const [liveCount, setLiveCount] = useState({ total: 0, failed: 0 })
  const freshId = useRef<string | null>(null)

  useEffect(() => {
    if (paused) {
      return
    }
    const es = new EventSource(STREAM_URL, { withCredentials: true })
    es.onopen = () => setConnected(true)
    es.onerror = () => setConnected(false) // EventSource 自动重连
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
      setLiveCount((c) => ({
        total: c.total + 1,
        failed: c.failed + (ev.outcome === 'failure' ? 1 : 0),
      }))
    })
    return () => es.close()
  }, [paused])

  return {
    events,
    freshId: freshId.current,
    connected,
    paused,
    togglePaused: () => setPaused((p) => !p),
    liveCount,
  }
}

// KPI = stats 基值 + 自上次 stats 拉取后的 live 增量(下次 stats 拉取已含这些事件 → 重置增量)。
// snapshot 在 render 内随 statsAt 变化更新(ref,非 state),无闪烁、无重复计数。
export function useLiveKpi(
  base: Kpi,
  statsAt: number,
  live: { total: number; failed: number },
): Kpi {
  const snap = useRef({ at: statsAt, total: live.total, failed: live.failed })
  if (snap.current.at !== statsAt) {
    snap.current = { at: statsAt, total: live.total, failed: live.failed }
  }
  const dTotal = Math.max(0, live.total - snap.current.total)
  const dFailed = Math.max(0, live.failed - snap.current.failed)
  const totalEvents = base.totalEvents + dTotal
  const failedCount = base.failedCount + dFailed
  return {
    ...base,
    totalEvents,
    failedCount,
    successRate: totalEvents ? (totalEvents - failedCount) / totalEvents : 1,
  }
}
