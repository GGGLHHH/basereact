// 真数据接线:stats 聚合(轮询)+ 事件列表(表/流初始种子)+ 映射到本页领域类型。
// 后端 snake_case → 组件用的 camelCase 领域类型在这层翻译,组件不动。

import { keepPreviousData, useQuery } from '@tanstack/react-query'

import type { AuthEventType, Count, FailureReason, HourBucket, IpStat, Kpi } from './types'
import type { AuthEventRow, AuthStats } from '#/generated/api-types'

import { listAuthEvents, statsAuthEvents } from '#/generated/client'

import type { AuthEvent } from './types'

const STATS_KEY = ['auth-events', 'stats'] as const
const LIST_KEY = ['auth-events', 'list'] as const

/** dashboard 聚合(KPI/时序/分布)。轮询 truth-up;live 增量叠在其上(见 use-live)。 */
export function useAuthEventsStats() {
  return useQuery({
    queryKey: STATS_KEY,
    queryFn: () => statsAuthEvents({}),
    refetchInterval: 15_000,
    staleTime: 10_000,
  })
}

/** 近期事件(表 + 事件流初始种子)。keyset 首页,size 条。 */
export function useAuthEventsList(size = 80) {
  return useQuery({
    queryKey: [...LIST_KEY, size],
    queryFn: () => listAuthEvents({ query: { size } }),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
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
