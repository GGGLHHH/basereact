import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { AuthEvent, AuthOutcome } from './types'

import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

import { ago, hms } from './format'
import { EVENT_META, REASON_LABEL_KEY, TONE_VAR } from './palette'

const CAP = 80

function OutcomePill({ outcome }: { outcome: AuthOutcome }) {
  const ok = outcome === 'success'
  return (
    <span
      className='inline-flex items-center rounded-full px-2 py-0.5 text-[0.7rem] font-medium'
      style={{
        color: ok ? 'var(--auth-success)' : 'var(--auth-fail)',
        background: `color-mix(in oklch, ${ok ? 'var(--auth-success)' : 'var(--auth-fail)'} 14%, transparent)`,
      }}
    >
      {ok ? 'success' : 'failure'}
    </span>
  )
}

export function EventsTable({ events }: { events: AuthEvent[] }) {
  const { t } = useTranslation('common')
  const [outcome, setOutcome] = useState<'all' | AuthOutcome>('all')
  const [q, setQ] = useState('')

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return events
      .filter((e) => outcome === 'all' || e.outcome === outcome)
      .filter(
        (e) =>
          !needle ||
          (e.actor ?? '').toLowerCase().includes(needle) ||
          e.ip.toLowerCase().includes(needle),
      )
      .slice(0, CAP)
  }, [events, outcome, q])

  return (
    <Card className='gap-0 overflow-hidden py-0'>
      <div className='flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-3'>
        <h2 className='text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase'>
          {t('authLog.table.title')}
        </h2>
        <div className='flex items-center gap-2'>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('authLog.table.search')}
            className='h-8 w-44 font-mono text-xs'
          />
          <Select
            value={outcome}
            onValueChange={(v) => setOutcome(v as typeof outcome)}
          >
            <SelectTrigger
              size='sm'
              className='w-32'
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>{t('authLog.table.allOutcomes')}</SelectItem>
              <SelectItem value='success'>{t('authLog.chart.success')}</SelectItem>
              <SelectItem value='failure'>{t('authLog.chart.failure')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className='overflow-x-auto'>
        <Table>
          <TableHeader>
            <TableRow className='hover:bg-transparent'>
              <TableHead className='w-28'>{t('authLog.table.time')}</TableHead>
              <TableHead>{t('authLog.table.event')}</TableHead>
              <TableHead>{t('authLog.table.actor')}</TableHead>
              <TableHead>{t('authLog.table.source')}</TableHead>
              <TableHead className='w-24'>{t('authLog.table.channel')}</TableHead>
              <TableHead className='w-24 text-right'>{t('authLog.table.outcome')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className='h-24 text-center text-sm text-muted-foreground'
                >
                  {t('authLog.table.empty')}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((e) => {
                const meta = EVENT_META[e.eventType]
                return (
                  <TableRow key={e.id}>
                    <TableCell className='font-mono text-xs whitespace-nowrap text-muted-foreground'>
                      <span className='text-foreground'>{hms(e.occurredAt)}</span>
                      <span className='ml-1.5'>{ago(e.occurredAt)}</span>
                    </TableCell>
                    <TableCell>
                      <span className='flex items-center gap-2'>
                        <span
                          className='size-1.5 shrink-0 rounded-full'
                          style={{ background: TONE_VAR[meta.tone] }}
                        />
                        <span style={{ color: TONE_VAR[meta.tone] }}>{t(meta.labelKey)}</span>
                        {e.failureReason ? (
                          <span className='text-xs text-muted-foreground'>
                            {t(REASON_LABEL_KEY[e.failureReason])}
                          </span>
                        ) : null}
                      </span>
                    </TableCell>
                    <TableCell
                      className={cn('font-mono text-xs', !e.actor && 'text-muted-foreground')}
                    >
                      {e.actor ?? '—'}
                    </TableCell>
                    <TableCell className='font-mono text-xs tabular-nums'>{e.ip}</TableCell>
                    <TableCell>
                      <span className='text-xs text-muted-foreground'>{e.channel}</span>
                    </TableCell>
                    <TableCell className='text-right'>
                      <OutcomePill outcome={e.outcome} />
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}
