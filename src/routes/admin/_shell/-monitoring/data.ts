import type { HistoryRange, Service, Severity } from '#/generated/api-types'

import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { getMonitoring, getMonitoringHistory, listMonitoringLogs } from '#/generated/client'

/** 页面轮询间隔。后端每 15 秒存一个实时点,KPI / 表格是现算的,5 秒刷新足够"实时"。 */
export const REFRESH_MS = 5000

/** 实时报告:定时轮询;切到后台标签页时暂停(react-query 默认不在后台轮询)。 */
export function useMonitoring() {
  return useQuery({
    queryKey: ['monitoring'],
    queryFn: ({ signal }) => getMonitoring({ signal }),
    refetchInterval: REFRESH_MS,
    placeholderData: keepPreviousData,
  })
}

/** 历史(24 小时 ~ 1 年)。分钟级数据每分钟落一次盘,1 分钟刷新一次就够。`range` 为空 = 不查(看实时 1 小时)。 */
export function useMonitoringHistory(range: HistoryRange | null) {
  return useQuery({
    queryKey: ['monitoring', 'history', range],
    queryFn: ({ signal }) => getMonitoringHistory({ query: { range: range ?? undefined }, signal }),
    enabled: range !== null,
    refetchInterval: 60_000,
    placeholderData: keepPreviousData,
  })
}

export interface LogFilters {
  from?: string
  to?: string
  level?: Severity
  service?: Service
  q?: string
  requestId?: string
  page: number
  size: number
}

/** 日志:翻页 / 筛选时保留上一页数据(不闪);第一页 15 秒自动刷新,翻到后面就不刷(免得内容在眼前移位)。 */
export function useMonitoringLogs(f: LogFilters) {
  return useQuery({
    queryKey: ['monitoring', 'logs', f],
    queryFn: ({ signal }) => listMonitoringLogs({
      query: {
        from: f.from,
        to: f.to,
        level: f.level,
        service: f.service,
        q: f.q,
        request_id: f.requestId,
        page: f.page,
        size: f.size,
      },
      signal,
    }),
    refetchInterval: f.page === 1 && f.to === undefined ? 15_000 : false,
    placeholderData: keepPreviousData,
  })
}
