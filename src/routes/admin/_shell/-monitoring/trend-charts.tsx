import type { HistoryPoint } from '#/generated/api-types'
import type { TrendRange } from './ranges'
import type { ChartConfig } from '@/components/ui/chart'

import { ToggleGroup, ToggleGroupItem } from '@gedatou/cadenza-ui'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'

import { dayTime, hm, hms } from './format'
import { TREND_RANGES } from './ranges'

interface Series {
  key: string
  title: string
  pick: (p: HistoryPoint) => number | null
  color: string
  format: (v: number) => string
}

interface TrendChartsProps {
  history: HistoryPoint[]
  range: TrendRange
  onRangeChange: (range: TrendRange) => void
  /** 点了图上某个点:那一段时间是 [at, at + stepSecs)。 */
  onPick?: (at: string, stepSecs: number) => void
  stepSecs: number
  loading?: boolean
  /** 范围上方的提示(如"没配 ops 数据库,只有最近一段")。 */
  notice?: string
}

/** 小多图:每张一个指标、各用各的 y 轴(不做双轴),悬停看具体时刻的值,点击跳到那段时间的日志。 */
export function TrendCharts({ history, range, onRangeChange, onPick, stepSecs, loading = false, notice }: TrendChartsProps) {
  const { t } = useTranslation('common')
  // 跨天的范围,横轴带日期。
  const tick = range === '1h' || range === '24h' ? hm : dayTime
  const accent = 'var(--auth-accent)'
  const series: Series[] = [
    { key: 'requests', title: t('monitoring.charts.requests'), pick: p => p.requests, color: accent, format: v => String(Math.round(v)) },
    { key: 'errors', title: t('monitoring.charts.errors'), pick: p => p.errors_5xx, color: 'var(--auth-fail)', format: v => String(Math.round(v)) },
    { key: 'p95', title: t('monitoring.charts.p95'), pick: p => p.p95_ms ?? null, color: accent, format: v => v.toFixed(v < 10 ? 1 : 0) },
    { key: 'dbP95', title: t('monitoring.charts.dbP95'), pick: p => p.db_p95_ms ?? null, color: accent, format: v => v.toFixed(v < 10 ? 1 : 0) },
    { key: 'memory', title: t('monitoring.charts.memory'), pick: p => (p.rss_bytes != null ? p.rss_bytes / 1024 / 1024 : null), color: accent, format: v => v.toFixed(0) },
    { key: 'cpu', title: t('monitoring.charts.cpu'), pick: p => p.cpu_percent ?? null, color: accent, format: v => v.toFixed(1) },
    { key: 'pool', title: t('monitoring.charts.pool'), pick: p => p.pool_in_use, color: accent, format: v => String(Math.round(v)) },
    { key: 'pipeline', title: t('monitoring.charts.pipeline'), pick: p => p.outbox_published, color: accent, format: v => String(Math.round(v)) },
  ]

  return (
    <section className='flex flex-col gap-3'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <h2 className='text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase'>
          {t('monitoring.charts.title')}
        </h2>
        <ToggleGroup
          aria-label={t('monitoring.charts.title')}
          value={[range]}
          onValueChange={(v) => {
            const next = v[0]
            if (next !== undefined)
              onRangeChange(next)
          }}
          variant='outline'
          size='sm'
          spacing={0}
        >
          {TREND_RANGES.map(r => (
            <ToggleGroupItem
              key={r}
              value={r}
            >
              {t(`monitoring.range.${r}`)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      {notice != null ? <p className='text-xs text-muted-foreground'>{notice}</p> : null}
      {history.length === 0
        ? (
            <Card className='p-6 text-center text-sm text-muted-foreground'>
              {loading ? t('monitoring.loading') : t(range === '1h' ? 'monitoring.charts.collecting' : 'monitoring.charts.empty')}
            </Card>
          )
        : (
            <div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4'>
              {series.map(s => (
                <MiniChart
                  key={s.key}
                  series={s}
                  history={history}
                  tick={tick}
                  onPick={onPick === undefined ? undefined : at => onPick(at, stepSecs)}
                />
              ))}
            </div>
          )}
    </section>
  )
}

function MiniChart({ series, history, tick, onPick }: {
  series: Series
  history: HistoryPoint[]
  tick: (iso: string) => string
  onPick?: (at: string) => void
}) {
  const gradientId = useId().replaceAll(':', '')
  const data = history.map(p => ({ t: p.at, value: series.pick(p) }))
  const config = { value: { label: series.title, color: series.color } } satisfies ChartConfig

  return (
    <Card className='gap-2 py-4'>
      <CardHeader className='px-4 pb-0'>
        <CardTitle className='text-sm font-medium'>{series.title}</CardTitle>
      </CardHeader>
      <CardContent className='px-2 pt-0'>
        <ChartContainer
          config={config}
          className='aspect-auto! h-36 w-full'
        >
          <AreaChart
            data={data}
            margin={{ left: 0, right: 8, top: 6 }}
            className={onPick === undefined ? undefined : 'cursor-pointer'}
            onClick={(state) => {
              const label = state?.activeLabel
              if (onPick !== undefined && typeof label === 'string')
                onPick(label)
            }}
          >
            <defs>
              <linearGradient
                id={gradientId}
                x1='0'
                y1='0'
                x2='0'
                y2='1'
              >
                <stop
                  offset='0%'
                  stopColor='var(--color-value)'
                  stopOpacity={0.35}
                />
                <stop
                  offset='100%'
                  stopColor='var(--color-value)'
                  stopOpacity={0.03}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              strokeDasharray='2 4'
            />
            <XAxis
              dataKey='t'
              tickLine={false}
              axisLine={false}
              tickMargin={6}
              minTickGap={48}
              tickFormatter={tick}
              className='font-mono text-[0.6rem]'
            />
            <YAxis
              width={36}
              tickLine={false}
              axisLine={false}
              tickCount={3}
              allowDecimals={false}
              tickFormatter={(v: number) => series.format(v)}
              className='font-mono text-[0.6rem]'
            />
            <ChartTooltip
              content={(
                <ChartTooltipContent
                  labelFormatter={v => hms(String(v))}
                  formatter={value => (
                    <span className='flex w-full justify-between gap-3'>
                      <span className='text-muted-foreground'>{series.title}</span>
                      <span className='font-mono'>{typeof value === 'number' ? series.format(value) : '—'}</span>
                    </span>
                  )}
                  className='font-mono'
                />
              )}
            />
            <Area
              dataKey='value'
              type='monotone'
              stroke='var(--color-value)'
              fill={`url(#${gradientId})`}
              strokeWidth={2}
              isAnimationActive={false}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
