// 认证审计事件 —— 前端视图形状,镜像后端 search.auth_event(camelCase)。

import type { AuthChannel, AuthEventType, AuthOutcome, FailureReason } from '#/generated/api-types'

// 事件类型/通道/结果/失败原因单一真相源 = 后端枚举(regen 的闭合 union)。后端加变体 → regen →
// union 变宽 → palette 的 exhaustive Record 编译不过,逼前端处理(漂移构建期抓)。
export type { AuthEventType, AuthChannel, AuthOutcome, FailureReason }

/** 视觉色调(安全语义)。见 palette.ts。 */
export type Tone = 'success' | 'fail' | 'warn' | 'accent' | 'muted'

export interface AuthEvent {
  id: string
  eventType: AuthEventType
  /** ISO-8601 UTC。 */
  occurredAt: string
  channel: AuthChannel
  outcome: AuthOutcome
  /** 显示主体:成功=用户名,失败=提交的 identifier;系统事件可为 null。 */
  actor: string | null
  userId: string | null
  failureReason: FailureReason | null
  ip: string
  userAgent: string
  /** Phase 2 富化,现恒 null。 */
  country: string | null
  city: string | null
}

export interface HourBucket {
  /** 该桶起始时刻(ISO)。 */
  t: string
  success: number
  failure: number
}

export interface Kpi {
  totalEvents: number
  successRate: number
  failedCount: number
  uniqueIps: number
  /** 与上一等长窗口比的变化率(-1..+n),用于趋势标记。 */
  totalDelta: number
  failedDelta: number
}

export interface Count<T extends string> {
  key: T
  count: number
}

export interface IpStat {
  ip: string
  failures: number
  total: number
}

export interface AuthLogData {
  kpi: Kpi
  activity: HourBucket[]
  reasons: Count<FailureReason>[]
  types: Count<AuthEventType>[]
  topIps: IpStat[]
  recent: AuthEvent[]
}
