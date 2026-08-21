import type { DataTableColumn } from '@gedatou/cadenza-ui'

import type { TFunction } from 'i18next'
// 领域形状/调色板/格式化仍在路由私有 -auth-log 里(整个 dashboard 共用)。ponytail: 若更多
// 部件外迁 business,再把 types/palette/format 一并挪过来,这里改成同级 import。
import type { AuthEvent } from '#/routes/admin/_shell/-auth-log/types'

import { ago, hms } from '#/routes/admin/_shell/-auth-log/format'
import { EVENT_META, REASON_LABEL_KEY, TONE_VAR } from '#/routes/admin/_shell/-auth-log/palette'
import { cn } from '@/lib/utils'

import { OutcomePill } from './outcome-pill'

export type AuthEventColumnDef = DataTableColumn<AuthEvent>

// 认证事件表列。与 user-table-columns 一致:纯列定义、cell 自渲染,t 由调用方注入。
// 固定宽的列(时间/通道/结果)给 width;其余自适应。cell 直接收行数据本身
// (cadenza 的列模型是纯数组,没有 TanStack 的 row 包装)。
export function createAuthEventColumns(t: TFunction<'common'>): AuthEventColumnDef[] {
  return [
    {
      id: 'time',
      header: t('authLog.table.time'),
      rowHeader: true,
      width: 132,
      cell: event => (
        <span className='font-mono text-xs whitespace-nowrap text-muted-foreground'>
          <span className='text-foreground'>{hms(event.occurredAt)}</span>
          <span className='ml-1.5'>{ago(event.occurredAt)}</span>
        </span>
      ),
    },
    {
      id: 'event',
      header: t('authLog.table.event'),
      cell: (e) => {
        const meta = EVENT_META[e.eventType]
        return (
          <span className='flex items-center gap-2'>
            <span
              className='size-1.5 shrink-0 rounded-full'
              style={{ background: TONE_VAR[meta.tone] }}
            />
            <span style={{ color: TONE_VAR[meta.tone] }}>{t(meta.labelKey)}</span>
            {e.failureReason
              ? (
                  <span className='text-xs text-muted-foreground'>
                    {t(REASON_LABEL_KEY[e.failureReason])}
                  </span>
                )
              : null}
          </span>
        )
      },
    },
    {
      id: 'actor',
      header: t('authLog.table.actor'),
      cell: event => (
        <span className={cn('font-mono text-xs', (event.actor ?? '') === '' && 'text-muted-foreground')}>
          {event.actor ?? '—'}
        </span>
      ),
    },
    {
      id: 'source',
      header: t('authLog.table.source'),
      cell: event => <span className='font-mono text-xs tabular-nums'>{event.ip}</span>,
    },
    {
      id: 'channel',
      header: t('authLog.table.channel'),
      width: 110,
      cell: event => (
        <span className='text-xs text-muted-foreground'>{event.channel}</span>
      ),
    },
    {
      id: 'outcome',
      header: <div className='text-right'>{t('authLog.table.outcome')}</div>,
      width: 110,
      cell: event => (
        <div className='flex justify-end'>
          <OutcomePill outcome={event.outcome} />
        </div>
      ),
    },
  ]
}
