import { useTranslation } from 'react-i18next'
import { Cell, Pie, PieChart } from 'recharts'

import type { ChartConfig } from '@/components/ui/chart'
import type { AuthEventType, Count, FailureReason, IpStat } from './types'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { cn } from '@/lib/utils'

import { EVENT_META, REASON_LABEL_KEY, TONE_VAR } from './palette'
import { RollNumber } from './roll-number'

// 失败原因 → 色(红/琥珀/紫分级,区分切片)。
const REASON_COLOR: Record<FailureReason, string> = {
  bad_password: 'var(--auth-fail)',
  unknown_user: 'var(--auth-warn)',
  rate_limited: 'var(--auth-accent)',
  account_locked: 'var(--muted-foreground)',
  no_admin_perm: 'color-mix(in oklch, var(--auth-warn) 60%, var(--auth-fail))',
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className='gap-3'>
      <CardHeader className='pb-0'>
        <CardTitle className='text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase'>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className='pt-0'>{children}</CardContent>
    </Card>
  )
}

function FailureReasons({ data }: { data: Count<FailureReason>[] }) {
  const { t } = useTranslation('common')
  const total = data.reduce((s, d) => s + d.count, 0)
  const config: ChartConfig = Object.fromEntries(
    data.map((d) => [d.key, { label: t(REASON_LABEL_KEY[d.key]), color: REASON_COLOR[d.key] }]),
  )
  return (
    <Panel title={t('authLog.breakdown.reasons')}>
      <div className='flex items-center gap-4'>
        <div className='relative shrink-0'>
          <ChartContainer
            config={config}
            className='aspect-square! size-33'
          >
            <PieChart>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    nameKey='key'
                    hideLabel
                    className='font-mono'
                  />
                }
              />
              <Pie
                data={data}
                dataKey='count'
                nameKey='key'
                innerRadius={44}
                outerRadius={62}
                strokeWidth={2}
                paddingAngle={2}
              >
                {data.map((d) => (
                  <Cell
                    key={d.key}
                    fill={REASON_COLOR[d.key]}
                    stroke='var(--card)'
                  />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className='pointer-events-none absolute inset-0 flex flex-col items-center justify-center'>
            <RollNumber
              value={total}
              fontSize={20}
              color='var(--auth-fail)'
            />
            <span className='mt-0.5 text-[0.6rem] tracking-wide text-muted-foreground uppercase'>
              {t('authLog.breakdown.failures')}
            </span>
          </div>
        </div>
        <ul className='min-w-0 flex-1 space-y-1.5 text-xs'>
          {data.map((d) => (
            <li
              key={d.key}
              className='flex items-center gap-2'
            >
              <span
                className='size-2 shrink-0 rounded-[3px]'
                style={{ background: REASON_COLOR[d.key] }}
              />
              <span className='min-w-0 flex-1 truncate text-muted-foreground'>
                {t(REASON_LABEL_KEY[d.key])}
              </span>
              <RollNumber
                value={d.count}
                fontSize={12}
              />
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  )
}

function BarRow({
  label,
  mono,
  value,
  max,
  color,
  sub,
  alert,
}: {
  label: string
  mono?: boolean
  value: number
  max: number
  color: string
  sub?: React.ReactNode
  alert?: boolean
}) {
  return (
    <li className='space-y-1'>
      <div className='flex items-baseline justify-between gap-2 text-xs'>
        <span className={cn('min-w-0 truncate', mono && 'font-mono', alert && 'text-auth-fail')}>
          {label}
        </span>
        <span className='flex shrink-0 items-baseline gap-1.5 text-muted-foreground'>
          {sub}
          <RollNumber
            value={value}
            fontSize={12}
          />
        </span>
      </div>
      <div className='h-1.5 w-full overflow-hidden rounded-full bg-muted'>
        <div
          className='h-full rounded-full'
          style={{ width: `${max ? (value / max) * 100 : 0}%`, background: color }}
        />
      </div>
    </li>
  )
}

function EventTypes({ data }: { data: Count<AuthEventType>[] }) {
  const { t } = useTranslation('common')
  const max = Math.max(1, ...data.map((d) => d.count))
  return (
    <Panel title={t('authLog.breakdown.types')}>
      <ul className='space-y-2.5'>
        {data.slice(0, 6).map((d) => (
          <BarRow
            key={d.key}
            label={t(EVENT_META[d.key].labelKey)}
            value={d.count}
            max={max}
            color={TONE_VAR[EVENT_META[d.key].tone]}
          />
        ))}
      </ul>
    </Panel>
  )
}

function TopIps({ data }: { data: IpStat[] }) {
  const { t } = useTranslation('common')
  const max = Math.max(1, ...data.map((d) => d.total))
  return (
    <Panel title={t('authLog.breakdown.topIps')}>
      <ul className='space-y-2.5'>
        {data.map((d) => {
          // 失败占比高 = 疑似暴力破解 → 标红。
          const suspicious = d.total > 0 && d.failures / d.total > 0.5 && d.failures >= 4
          return (
            <BarRow
              key={d.ip}
              label={d.ip}
              mono
              value={d.total}
              max={max}
              sub={
                d.failures ? (
                  <span className='flex items-baseline gap-0.5 font-mono'>
                    <RollNumber
                      value={Math.round((d.failures / d.total) * 100)}
                      fontSize={12}
                    />
                    <span>% {t('authLog.breakdown.fail')}</span>
                  </span>
                ) : undefined
              }
              color={suspicious ? 'var(--auth-fail)' : 'var(--muted-foreground)'}
              alert={suspicious}
            />
          )
        })}
      </ul>
    </Panel>
  )
}

export function Breakdowns({
  reasons,
  types,
  topIps,
}: {
  reasons: Count<FailureReason>[]
  types: Count<AuthEventType>[]
  topIps: IpStat[]
}) {
  return (
    <div className='grid gap-4 sm:grid-cols-2'>
      <FailureReasons data={reasons} />
      <EventTypes data={types} />
      <div className='sm:col-span-2'>
        <TopIps data={topIps} />
      </div>
    </div>
  )
}
