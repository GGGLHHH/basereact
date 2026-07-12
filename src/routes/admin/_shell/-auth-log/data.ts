// 真数据接线:stats 聚合 + 事件列表(表/流初始种子)各取一次快照 + 映射到本页领域类型。
// 快照之后不再轮询——SSE 送来的每条事件本身就够把 KPI/图表/分布/列表继续往前滚
// (见 use-live.ts 的 useLiveStats),大屏该有的样子:一次快照 + 纯推送,没有"定时问一遍"。

import { keepPreviousData, useQuery } from '@tanstack/react-query'

import type {
  AuthEventType,
  AuthOutcome,
  Count,
  FailureReason,
  HourBucket,
  IpStat,
  Kpi,
} from './types'
import type { AuthEventRow, AuthStats } from '#/generated/api-types'

import { listAuthEvents, statsAuthEvents } from '#/generated/client'

import type { AuthEvent } from './types'

const STATS_KEY = ['auth-events', 'stats'] as const
const LIST_KEY = ['auth-events', 'list'] as const

/** dashboard 聚合(KPI/时序/分布)基线快照,取一次。之后的鲜度由 SSE 流叠加(useLiveStats)。 */
export function useAuthEventsStats() {
  return useQuery({
    queryKey: STATS_KEY,
    queryFn: () => statsAuthEvents({}),
  })
}

/** 近期事件基线快照(**事件流初始种子**,喂 tape/KPI 叠加),取一次。keyset 首页,size 条。 */
export function useAuthEventsList(size = 80) {
  return useQuery({
    queryKey: [...LIST_KEY, size],
    queryFn: () => listAuthEvents({ query: { size } }),
    placeholderData: keepPreviousData,
  })
}

/** 事件表:**服务端**过滤(`q` 联合模糊搜 actor/identifier/ip 子串 + `outcome` 状态)+ offset 分页 + total。
 *  全历史检索,取代前端对近期流(≤200 条)的内存过滤/切片。`q`/`outcome` 为空即不过滤。 */
export function useAuthEventsPage(f: {
  page: number
  size: number
  q: string
  outcome: 'all' | AuthOutcome
}) {
  const q = f.q.trim() || undefined
  const outcome = f.outcome === 'all' ? undefined : f.outcome
  return useQuery({
    queryKey: [...LIST_KEY, 'page', f.page, f.size, q ?? '', outcome ?? ''],
    queryFn: () =>
      listAuthEvents({
        query: {
          page: f.page,
          size: f.size,
          with_total: true,
          ...(q ? { q } : {}),
          ...(outcome ? { outcome } : {}),
        },
      }),
    placeholderData: keepPreviousData,
  })
}

// 后端读模型不含用户名(只 user_id + identifier_attempted);展示主体:失败取 identifier,
// 成功暂取 user_id(读模型富化用户名是后续项)。ponytail: 富 auth_event.actor_name 后改这里。
export function toAuthEvent(row: AuthEventRow): AuthEvent {
  return {
    id: row.id,
    eventType: row.event_type,
    occurredAt: row.occurred_at,
    channel: row.channel,
    outcome: row.outcome,
    actor: row.actor ?? row.identifier_attempted ?? row.user_id ?? null,
    userId: row.user_id ?? null,
    failureReason: row.failure_reason ?? null,
    ip: row.ip ?? '',
    userAgent: row.user_agent ?? '',
    country: row.country ?? null,
    city: row.city ?? null,
  }
}

export interface MappedStats {
  kpi: Kpi
  activity: HourBucket[]
  reasons: Count<FailureReason>[]
  types: Count<AuthEventType>[]
  topIps: IpStat[]
}

const ZERO_KPI: Kpi = {
  totalEvents: 0,
  successRate: 1,
  failedCount: 0,
  uniqueIps: 0,
  totalDelta: 0,
  failedDelta: 0,
}

/** AuthStats(后端)→ 组件领域形状。后端不算 delta(留 0,Trend 侧隐藏)。 */
export function mapStats(s: AuthStats | undefined): MappedStats {
  if (!s) {
    return { kpi: ZERO_KPI, activity: [], reasons: [], types: [], topIps: [] }
  }
  return {
    kpi: {
      totalEvents: s.kpi.total_events,
      failedCount: s.kpi.failed_count,
      uniqueIps: s.kpi.unique_ips,
      successRate: s.kpi.success_rate,
      totalDelta: s.kpi.total_delta,
      failedDelta: s.kpi.failed_delta,
    },
    activity: s.activity.map((b) => ({ t: b.t, success: b.success, failure: b.failure })),
    reasons: s.reasons.map((c) => ({ key: c.key, count: c.count })),
    types: s.types.map((c) => ({ key: c.key, count: c.count })),
    topIps: s.top_ips.map((i) => ({ ip: i.ip, failures: i.failures, total: i.total })),
  }
}
