import type { DataTableColumn } from '@gedatou/cadenza-ui'
import type { TFunction } from 'i18next'
import type {
  DbOperationStats,
  InstanceReport,
  OutboxStatus,
  ProjectorStatus,
  RouteStats,
} from '#/generated/api-types'

import { DataTable, DataTableEmpty, Progress } from '@gedatou/cadenza-ui'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

import { duration, ms, num, secondsSince } from './format'
import { StatusMark } from './status'

/** 慢于这个阈值的 p95 标红。 */
const SLOW_MS = 1000
/** outbox relay 每秒轮询一次;超过这么久没轮询成功 = 停滞。 */
const RELAY_STALE_SECS = 60
/** 接口 / 数据库表的高度上限:超出在表内滚动(表头吸顶)。 */
const TABLE_MAX_H = 360

const NUM_COL = 'text-right font-mono tabular-nums'

function SectionTitle({ title, extra }: { title: string, extra?: string }) {
  return (
    <div className='flex items-baseline justify-between gap-3'>
      <h2 className='text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase'>{title}</h2>
      {extra != null ? <span className='text-xs text-muted-foreground'>{extra}</span> : null}
    </div>
  )
}

function Latency({ v }: { v: number | null | undefined }) {
  return <span className={cn((v ?? 0) > SLOW_MS && 'font-semibold text-auth-fail')}>{ms(v)}</span>
}

function Count({ n, alert = false }: { n: number, alert?: boolean }) {
  return <span className={cn(alert && n > 0 && 'font-semibold text-auth-fail')}>{num(n)}</span>
}

function routeColumns(t: TFunction<'common'>): DataTableColumn<RouteStats>[] {
  return [
    {
      id: 'route',
      header: t('monitoring.routes.path'),
      rowHeader: true,
      maxWidth: 360,
      cell: r => (
        <span className='flex min-w-0 items-baseline gap-2 font-mono text-xs'>
          <span className='w-12 shrink-0 text-muted-foreground'>{r.method}</span>
          <span
            className='truncate'
            title={r.route}
          >
            {r.route}
          </span>
        </span>
      ),
    },
    { id: 'requests', header: t('monitoring.routes.requests'), width: 80, className: NUM_COL, cell: r => num(r.requests) },
    { id: 'e4', header: '4xx', width: 64, className: NUM_COL, cell: r => <Count n={r.errors_4xx} /> },
    { id: 'e5', header: '5xx', width: 64, className: NUM_COL, cell: r => <Count n={r.errors_5xx} alert /> },
    { id: 'p50', header: 'p50', width: 84, className: NUM_COL, cell: r => <Latency v={r.p50_ms} /> },
    { id: 'p95', header: 'p95', width: 84, className: NUM_COL, cell: r => <Latency v={r.p95_ms} /> },
  ]
}

function dbColumns(t: TFunction<'common'>): DataTableColumn<DbOperationStats>[] {
  return [
    {
      id: 'name',
      header: t('monitoring.db.operation'),
      rowHeader: true,
      maxWidth: 280,
      cell: o => (
        <span
          className='block truncate font-mono text-xs'
          title={o.name}
        >
          {o.name}
        </span>
      ),
    },
    { id: 'calls', header: t('monitoring.db.calls'), width: 72, className: NUM_COL, cell: o => num(o.calls) },
    { id: 'p50', header: 'p50', width: 84, className: NUM_COL, cell: o => <Latency v={o.p50_ms} /> },
    { id: 'p95', header: 'p95', width: 84, className: NUM_COL, cell: o => <Latency v={o.p95_ms} /> },
  ]
}

function outboxColumns(t: TFunction<'common'>): DataTableColumn<OutboxStatus>[] {
  return [
    { id: 'source', header: t('monitoring.outbox.source'), rowHeader: true, cell: o => <span className='font-mono text-xs'>{o.source}</span> },
    { id: 'published', header: t('monitoring.outbox.published'), width: 72, className: NUM_COL, cell: o => num(o.published) },
    { id: 'failures', header: t('monitoring.outbox.failures'), width: 60, className: NUM_COL, cell: o => <Count n={o.failures} alert /> },
    {
      id: 'lastPoll',
      header: t('monitoring.outbox.lastPoll'),
      width: 96,
      className: 'text-right',
      cell: (o) => {
        const age = o.last_poll_at != null ? secondsSince(o.last_poll_at) : null
        return (
          <StatusMark
            health={age == null || age > RELAY_STALE_SECS ? 'down' : 'ok'}
            label={age == null ? t('monitoring.outbox.never') : t('monitoring.outbox.ago', { value: duration(age) })}
          />
        )
      },
    },
  ]
}

function projectorColumns(t: TFunction<'common'>): DataTableColumn<ProjectorStatus>[] {
  return [
    {
      id: 'name',
      header: t('monitoring.projectors.name'),
      rowHeader: true,
      maxWidth: 200,
      cell: p => (
        <span
          className='block truncate font-mono text-xs'
          title={p.name}
        >
          {p.name}
        </span>
      ),
    },
    { id: 'processed', header: t('monitoring.projectors.processed'), width: 64, className: NUM_COL, cell: p => num(p.processed) },
    { id: 'failed', header: t('monitoring.projectors.failed'), width: 52, className: NUM_COL, cell: p => <Count n={p.failed} alert /> },
    { id: 'lag', header: t('monitoring.projectors.lag'), width: 72, className: NUM_COL, cell: p => ms(p.last_lag_ms) },
    {
      id: 'pending',
      header: t('monitoring.projectors.pending'),
      width: 56,
      className: NUM_COL,
      cell: p => (p.pending != null ? <Count n={p.pending} alert={p.pending > 1000} /> : '—'),
    },
  ]
}

export function RoutesTable({ routes }: { routes: RouteStats[] }) {
  const { t } = useTranslation('common')
  const columns = useMemo(() => routeColumns(t), [t])
  return (
    <section className='flex min-w-0 flex-col gap-3'>
      <SectionTitle
        title={t('monitoring.routes.title')}
        extra={t('monitoring.routes.count', { count: routes.length })}
      />
      <DataTable
        aria-label={t('monitoring.routes.title')}
        columns={columns}
        items={routes}
        getRowId={r => `${r.method} ${r.route}`}
        maxHeight={TABLE_MAX_H}
      >
        <DataTableEmpty>{t('monitoring.routes.empty')}</DataTableEmpty>
      </DataTable>
    </section>
  )
}

export function DbTable({ ops }: { ops: DbOperationStats[] }) {
  const { t } = useTranslation('common')
  const columns = useMemo(() => dbColumns(t), [t])
  return (
    <section className='flex min-w-0 flex-col gap-3'>
      <SectionTitle
        title={t('monitoring.db.title')}
        extra={t('monitoring.db.count', { count: ops.length })}
      />
      <DataTable
        aria-label={t('monitoring.db.title')}
        columns={columns}
        items={ops}
        getRowId={o => o.name}
        maxHeight={TABLE_MAX_H}
      >
        <DataTableEmpty>{t('monitoring.db.empty')}</DataTableEmpty>
      </DataTable>
    </section>
  )
}

/** 连接池 / outbox relay / projector:有没有卡住、有没有积压。 */
export function BackgroundPanels({ instance: i }: { instance: InstanceReport }) {
  const { t } = useTranslation('common')
  const outbox = useMemo(() => outboxColumns(t), [t])
  const projectors = useMemo(() => projectorColumns(t), [t])

  return (
    <div className='grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3'>
      <section className='flex min-w-0 flex-col gap-3'>
        <SectionTitle title={t('monitoring.pools.title')} />
        <Card className='gap-3 p-4'>
          {i.pools.length === 0
            ? <p className='py-4 text-center text-sm text-muted-foreground'>{t('monitoring.pools.empty')}</p>
            : i.pools.map(p => (
                <div
                  key={p.name}
                  className='flex flex-col gap-1.5'
                >
                  <div className='flex items-baseline justify-between text-xs'>
                    <span className='font-mono'>{p.name}</span>
                    <span className='font-mono text-muted-foreground tabular-nums'>
                      {t('monitoring.pools.usage', { inUse: p.in_use, max: p.max, idle: p.idle })}
                    </span>
                  </div>
                  <Progress
                    value={p.in_use}
                    max={Math.max(p.max, 1)}
                    aria-label={p.name}
                  />
                </div>
              ))}
        </Card>
      </section>

      <section className='flex min-w-0 flex-col gap-3'>
        <SectionTitle title={t('monitoring.outbox.title')} />
        <DataTable
          aria-label={t('monitoring.outbox.title')}
          columns={outbox}
          items={i.outbox}
          getRowId={o => o.source}
        >
          <DataTableEmpty>{t('monitoring.outbox.empty')}</DataTableEmpty>
        </DataTable>
      </section>

      <section className='flex min-w-0 flex-col gap-3'>
        <SectionTitle title={t('monitoring.projectors.title')} />
        <DataTable
          aria-label={t('monitoring.projectors.title')}
          columns={projectors}
          items={i.projectors}
          getRowId={p => p.name}
        >
          <DataTableEmpty>{t('monitoring.projectors.empty')}</DataTableEmpty>
        </DataTable>
      </section>
    </div>
  )
}
