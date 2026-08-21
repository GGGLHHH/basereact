import type { AuthOutcome } from '#/routes/admin/_shell/-auth-log/types'

// 从 auth-event-table-columns.tsx 拆出来:那个文件导出的 createAuthEventColumns
// 是非组件,组件和它同住会拦住 Fast Refresh。
export function OutcomePill({ outcome }: { outcome: AuthOutcome }) {
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
