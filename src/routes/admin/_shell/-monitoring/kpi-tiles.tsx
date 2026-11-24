import type { InstanceReport } from '#/generated/api-types'

import { useTranslation } from 'react-i18next'

import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

import { bytes, ms, num, pct } from './format'
import { ERROR_RATE_WARN } from './health'

function Tile({ label, value, foot, alert = false }: {
  label: string
  value: string
  foot?: string
  alert?: boolean
}) {
  return (
    <Card className='gap-0 p-4'>
      <div className='text-[0.7rem] font-medium tracking-[0.14em] text-muted-foreground uppercase'>{label}</div>
      <div className={cn('mt-2 font-mono text-2xl leading-none font-semibold tabular-nums', alert && 'text-auth-fail')}>
        {value}
      </div>
      {foot != null ? <div className='mt-2 text-xs text-muted-foreground tabular-nums'>{foot}</div> : null}
    </Card>
  )
}

export function KpiTiles({ instance: i }: { instance: InstanceReport }) {
  const { t } = useTranslation('common')
  const tr = i.traffic
  const errorRate = tr.requests > 0 ? tr.errors_5xx / tr.requests : 0
  const poolInUse = i.pools.reduce((s, p) => s + p.in_use, 0)
  const poolMax = i.pools.reduce((s, p) => s + p.max, 0)
  const sse = i.sse.reduce((s, x) => s + x.connections, 0)

  return (
    <div className='grid grid-cols-2 gap-4 lg:grid-cols-4'>
      <Tile
        label={t('monitoring.kpi.requests')}
        value={num(tr.requests)}
        foot={t('monitoring.kpi.inFlight', { count: i.in_flight })}
      />
      <Tile
        label={t('monitoring.kpi.errorRate')}
        value={pct(errorRate)}
        alert={errorRate > ERROR_RATE_WARN}
        foot={t('monitoring.kpi.errorCounts', { e5: num(tr.errors_5xx), e4: num(tr.errors_4xx) })}
      />
      <Tile
        label={t('monitoring.kpi.p95')}
        value={ms(tr.p95_ms)}
        alert={(tr.p95_ms ?? 0) > 1000}
        foot={t('monitoring.kpi.p50p99', { p50: ms(tr.p50_ms), p99: ms(tr.p99_ms) })}
      />
      <Tile
        label={t('monitoring.kpi.pool')}
        value={poolMax > 0 ? `${poolInUse} / ${poolMax}` : '—'}
        alert={poolMax > 0 && poolInUse / poolMax > 0.9}
        foot={t('monitoring.kpi.poolFoot', { count: i.pools.length })}
      />
      <Tile
        label={t('monitoring.kpi.memory')}
        value={bytes(i.process.rss_bytes)}
        foot={i.process.threads != null ? t('monitoring.kpi.threads', { count: i.process.threads }) : undefined}
      />
      <Tile
        label={t('monitoring.kpi.cpu')}
        value={i.process.cpu_percent != null ? `${i.process.cpu_percent.toFixed(1)}%` : '—'}
        foot={t('monitoring.kpi.cpuFoot')}
      />
      <Tile
        label={t('monitoring.kpi.sse')}
        value={num(sse)}
        foot={i.sse.map(s => `${s.stream} ${s.connections}`).join(' · ') || undefined}
      />
      <Tile
        label={t('monitoring.kpi.dbCalls')}
        value={num(i.db_operations.reduce((s, d) => s + d.calls, 0))}
        foot={t('monitoring.kpi.dbOps', { count: i.db_operations.length })}
      />
    </div>
  )
}
