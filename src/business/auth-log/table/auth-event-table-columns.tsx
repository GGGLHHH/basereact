import { createColumnHelper } from '@tanstack/react-table'

import type { TFunction } from 'i18next'
import type { ColumnDef } from '@tanstack/react-table'
// 领域形状/调色板/格式化仍在路由私有 -auth-log 里(整个 dashboard 共用)。ponytail: 若更多
// 部件外迁 business,再把 types/palette/format 一并挪过来,这里改成同级 import。
import type { AuthEvent, AuthOutcome } from '#/routes/admin/_shell/-auth-log/types'

import { cn } from '@/lib/utils'
import { ago, hms } from '#/routes/admin/_shell/-auth-log/format'
import { EVENT_META, REASON_LABEL_KEY, TONE_VAR } from '#/routes/admin/_shell/-auth-log/palette'

const columnHelper = createColumnHelper<AuthEvent>()

export type AuthEventColumnDef = ColumnDef<AuthEvent, any>

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

// 认证事件表列。与 user-table-columns 一致:纯列定义、cell 自渲染,t 由调用方注入。
// 固定宽的列(时间/通道/结果)给 size;其余自适应。
export function createAuthEventColumns(t: TFunction<'common'>): AuthEventColumnDef[] {
  return [
    columnHelper.display({
      id: 'time',
      header: t('authLog.table.time'),
      size: 132,
      cell: ({ row }) => (
        <span className='font-mono text-xs whitespace-nowrap text-muted-foreground'>
          <span className='text-foreground'>{hms(row.original.occurredAt)}</span>
          <span className='ml-1.5'>{ago(row.original.occurredAt)}</span>
        </span>
      ),
    }),
    columnHelper.display({
      id: 'event',
      header: t('authLog.table.event'),
      cell: ({ row }) => {
        const e = row.original
        const meta = EVENT_META[e.eventType]
        return (
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
        )
      },
    }),
    columnHelper.display({
      id: 'actor',
      header: t('authLog.table.actor'),
      cell: ({ row }) => (
        <span className={cn('font-mono text-xs', !row.original.actor && 'text-muted-foreground')}>
          {row.original.actor ?? '—'}
        </span>
      ),
    }),
    columnHelper.display({
      id: 'source',
      header: t('authLog.table.source'),
      cell: ({ row }) => <span className='font-mono text-xs tabular-nums'>{row.original.ip}</span>,
    }),
    columnHelper.display({
      id: 'channel',
      header: t('authLog.table.channel'),
      size: 110,
      cell: ({ row }) => (
        <span className='text-xs text-muted-foreground'>{row.original.channel}</span>
      ),
    }),
    columnHelper.display({
      id: 'outcome',
      header: () => <div className='text-right'>{t('authLog.table.outcome')}</div>,
      size: 110,
      cell: ({ row }) => (
        <div className='flex justify-end'>
          <OutcomePill outcome={row.original.outcome} />
        </div>
      ),
    }),
  ]
}
