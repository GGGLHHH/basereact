import { useTranslation } from 'react-i18next'

import type { AuthEvent } from './types'

import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

import { hms } from './format'
import { EVENT_META, TONE_GLYPH, TONE_VAR } from './palette'

const CAP = 40

function TapeRow({ e, fresh }: { e: AuthEvent; fresh: boolean }) {
  const { t } = useTranslation('common')
  const meta = EVENT_META[e.eventType]
  const tone = TONE_VAR[meta.tone]
  return (
    <div
      className={cn(
        'grid grid-cols-[1rem_auto_1fr_auto] items-center gap-x-2.5 px-3 py-1.5 font-mono text-xs',
        'border-b border-border/40 last:border-0',
        fresh && 'motion-safe:animate-[auth-tape-in_.5s_ease-out]',
      )}
      style={fresh ? { ['--flash' as string]: tone } : undefined}
    >
      <span
        className='text-center'
        style={{ color: tone }}
      >
        {TONE_GLYPH[meta.tone]}
      </span>
      <span className='text-muted-foreground tabular-nums'>{hms(e.occurredAt)}</span>
      {/* label 占位不缩,actor 溢出才截 —— 谁在做什么一眼可读,原因留给下方表格。 */}
      <span className='flex min-w-0 items-baseline gap-1.5'>
        <span
          className='shrink-0'
          style={{ color: tone }}
        >
          {t(meta.labelKey)}
        </span>
        <span className='min-w-0 truncate text-foreground/70'>{e.actor ?? '—'}</span>
      </span>
      <span className='text-muted-foreground tabular-nums'>{e.ip}</span>
    </div>
  )
}

export function EventTape({
  events,
  paused,
  onTogglePaused,
  freshId,
}: {
  events: AuthEvent[]
  paused: boolean
  onTogglePaused: () => void
  freshId: string | null
}) {
  const { t } = useTranslation('common')
  const rows = events.slice(0, CAP)

  return (
    // lg 起:父层是 absolute inset-0 的壳,h-full 精确吃满那个高度(壳的高度 = 左栏
    // 天然高度,见 auth-log.tsx 注释)。lg 以下父层退化成普通块,h-full 无 100% 可依附
    // 的祖先、按 auto 处理,靠 min-h-105 兜底,自然高度堆叠。
    <Card className='flex h-full min-h-105 flex-col gap-0 overflow-hidden py-0'>
      <CardHeader className='flex-row items-center justify-between gap-2 border-b border-border/60 px-3 py-2.5'>
        <CardTitle className='text-xs font-medium tracking-[0.12em] uppercase'>
          {t('authLog.tape.title')}
        </CardTitle>
        <button
          type='button'
          onClick={onTogglePaused}
          className='flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-[0.7rem] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
          aria-pressed={!paused}
        >
          {!paused ? (
            <span className='relative flex size-2'>
              <span className='absolute inline-flex size-full animate-ping rounded-full bg-auth-success opacity-70 motion-reduce:hidden' />
              <span className='relative inline-flex size-2 rounded-full bg-auth-success' />
            </span>
          ) : (
            <span className='size-2 rounded-full bg-muted-foreground' />
          )}
          {!paused ? t('authLog.tape.live') : t('authLog.tape.paused')}
        </button>
      </CardHeader>

      <div className='min-h-0 flex-1 overflow-y-auto'>
        {rows.map((e) => (
          <TapeRow
            key={e.id}
            e={e}
            fresh={e.id === freshId}
          />
        ))}
      </div>

      {/* 到达高亮关键帧(一次注入;reduced-motion 下不触发,见行上 motion-safe)。 */}
      <style>{`@keyframes auth-tape-in{from{opacity:0;transform:translateY(-4px);background:color-mix(in oklch,var(--flash) 20%,transparent)}to{opacity:1;transform:none;background:transparent}}`}</style>
    </Card>
  )
}
