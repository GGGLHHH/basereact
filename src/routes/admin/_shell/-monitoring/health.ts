import type { InstanceReport } from '#/generated/api-types'
import type { Health } from './status'

/** 5xx 比例超过它就算"错误偏多"(与 KPI 卡片的标红阈值一致)。 */
export const ERROR_RATE_WARN = 0.05

/** 进程整体健康:拉不到 / 任一依赖不可用 → 异常;5xx 偏多 → 警告。 */
export function instanceHealth(i: InstanceReport): Health {
  if (!i.reachable || i.checks.some(c => !c.ok))
    return 'down'
  if (i.traffic.requests > 0 && i.traffic.errors_5xx / i.traffic.requests > ERROR_RATE_WARN)
    return 'warn'
  return 'ok'
}
