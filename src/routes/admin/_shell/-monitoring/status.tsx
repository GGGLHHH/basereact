import { cn } from '@/lib/utils'

export type Health = 'ok' | 'warn' | 'down'

const TONE: Record<Health, { dot: string, text: string, glyph: string }> = {
  ok: { dot: 'bg-auth-success', text: 'text-auth-success', glyph: '●' },
  warn: { dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', glyph: '▲' },
  down: { dot: 'bg-auth-fail', text: 'text-auth-fail', glyph: '✕' },
}

/** 状态标记:形状(● ▲ ✕)+ 文字一起表达,不只靠颜色。 */
export function StatusMark({ health, label, className }: { health: Health, label: string, className?: string }) {
  const tone = TONE[health]
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', tone.text, className)}>
      <span
        aria-hidden
        className='text-[0.6rem] leading-none'
      >
        {tone.glyph}
      </span>
      {label}
    </span>
  )
}

/** 卡片标题行左侧的小色点(纯装饰,状态另有文字)。 */
export function HealthDot({ health }: { health: Health }) {
  return (
    <span
      aria-hidden
      className={cn('inline-block size-2 rounded-full', TONE[health].dot)}
    />
  )
}
