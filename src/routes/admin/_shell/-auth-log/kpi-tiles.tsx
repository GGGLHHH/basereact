import { useTranslation } from 'react-i18next'

import type { Kpi } from './types'

import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

import { RollNumber } from './roll-number'

interface TileProps {
  label: string
  toneVar: string
  children: React.ReactNode
  foot?: React.ReactNode
}

function Tile({ label, toneVar, children, foot }: TileProps) {
  return (
    <Card className='relative gap-0 overflow-hidden p-4'>
      {/* 顶边色条:每块的语义色调,一眼分区。 */}
      <span
        aria-hidden
        className='absolute inset-x-0 top-0 h-0.5'
        style={{ background: toneVar }}
      />
      <div className='text-[0.7rem] font-medium tracking-[0.14em] text-muted-foreground uppercase'>
        {label}
      </div>
      <div className='mt-3'>{children}</div>
      {foot ? <div className='mt-2 text-xs text-muted-foreground'>{foot}</div> : null}
    </Card>
  )
}

function Trend({ delta, invert = false }: { delta: number; invert?: boolean }) {
  // invert=true:上升是坏事(失败数)→ 红;否则上升是常态 → muted。
  const up = delta >= 0
  const bad = invert ? up : false
  const color = bad ? 'var(--auth-fail)' : 'var(--muted-foreground)'
  return (
    <span
      className={cn(
        'inline-flex items-baseline gap-1 font-mono',
        bad ? 'text-auth-fail' : 'text-muted-foreground',
      )}
    >
      <span>{up ? '▲' : '▼'}</span>
      <RollNumber
        value={Math.round(Math.abs(delta) * 100)}
        fontSize={12}
        weight={500}
        color={color}
      />
      <span>%</span>
    </span>
  )
}

export function KpiTiles({ kpi }: { kpi: Kpi }) {
  const { t } = useTranslation('common')
  const ratePct = Math.round(kpi.successRate * 100)

  return (
    <div className='grid grid-cols-2 gap-4 lg:grid-cols-4'>
      <Tile
        label={t('authLog.kpi.events')}
        toneVar='var(--auth-accent)'
        foot={
          <span>
            <Trend delta={kpi.totalDelta} /> {t('authLog.kpi.vsPrev')}
          </span>
        }
      >
        <RollNumber value={kpi.totalEvents} />
      </Tile>

      <Tile
        label={t('authLog.kpi.successRate')}
        toneVar='var(--auth-success)'
        foot={
          <div className='h-1 w-full overflow-hidden rounded-full bg-muted'>
            <div
              className='h-full rounded-full transition-[width] duration-700'
              style={{ width: `${kpi.successRate * 100}%`, background: 'var(--auth-success)' }}
            />
          </div>
        }
      >
        <span className='flex items-baseline gap-0.5'>
          <RollNumber value={ratePct} />
          <span className='font-mono text-3xl leading-none font-semibold'>%</span>
        </span>
      </Tile>

      <Tile
        label={t('authLog.kpi.failed')}
        toneVar='var(--auth-fail)'
        foot={
          <span>
            <Trend
              delta={kpi.failedDelta}
              invert
            />{' '}
            {t('authLog.kpi.vsPrev')}
          </span>
        }
      >
        <RollNumber
          value={kpi.failedCount}
          color='var(--auth-fail)'
        />
      </Tile>

      <Tile
        label={t('authLog.kpi.sources')}
        toneVar='var(--muted-foreground)'
        foot={t('authLog.kpi.uniqueIps')}
      >
        <RollNumber value={kpi.uniqueIps} />
      </Tile>
    </div>
  )
}
