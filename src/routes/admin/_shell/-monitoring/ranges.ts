/** 趋势的时间范围:1h 是进程内实时数据(15 秒一点),其余读历史(后端 `HistoryRange`)。 */
export type TrendRange = '1h' | '24h' | '7d' | '30d' | '90d' | '1y'

export const TREND_RANGES: TrendRange[] = ['1h', '24h', '7d', '30d', '90d', '1y']
