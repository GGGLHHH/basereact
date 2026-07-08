import { createFileRoute } from '@tanstack/react-router'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { ActivityChart } from './-auth-log/activity-chart'
import { Breakdowns } from './-auth-log/breakdowns'
import { mapStats, toAuthEvent, useAuthEventsList, useAuthEventsStats } from './-auth-log/data'
import { EventTape } from './-auth-log/event-tape'
import { EventsTable } from './-auth-log/events-table'
import { KpiTiles } from './-auth-log/kpi-tiles'
import { useAuthEventStream, useLiveKpi } from './-auth-log/use-live'

export const Route = createFileRoute('/admin/_shell/auth-log')({
  component: AuthLogPage,
  staticData: {
    titleKey: 'titles.adminAuthLog',
    menuTitleKey: 'titles.adminAuthLog',
    icon: 'i-tabler-shield-lock',
    groupKey: 'menuGroups.admin',
    order: 3,
    // 安全审计页,准入随 users:admin(与后端 auth-events 端点一致);无元数据会 fail-closed。
    accessPolicyKeys: ['listAuthEvents'],
  },
})

function AuthLogPage() {
  const { t } = useTranslation('common')
  const stats = useAuthEventsStats()
  const list = useAuthEventsList(80)
  const stream = useAuthEventStream()

  const mapped = useMemo(() => mapStats(stats.data), [stats.data])
  const kpi = useLiveKpi(mapped.kpi, stats.dataUpdatedAt, stream.liveCount)

  // tape + 表的近期事件:live 流置顶 + 列表首页(按 id 去重),封顶。
  const recent = useMemo(() => {
    const seed = (list.data?.items ?? []).map(toAuthEvent)
    const live = stream.events
    const seen = new Set(live.map((e) => e.id))
    return [...live, ...seed.filter((e) => !seen.has(e.id))].slice(0, 200)
  }, [stream.events, list.data])

  return (
    <div className='flex flex-col gap-4'>
      <header className='flex flex-wrap items-end justify-between gap-3'>
        <div className='space-y-1'>
          <h1 className='text-lg font-semibold tracking-tight'>{t('authLog.title')}</h1>
          <p className='text-sm text-muted-foreground'>{t('authLog.subtitle')}</p>
        </div>
        <span className='inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground'>
          <span
            className='i-tabler-clock size-3.5'
            aria-hidden
          />
          {t('authLog.window')}
        </span>
      </header>

      <KpiTiles kpi={kpi} />

      {/* 主区:左(活动 + 分布)占 2 栏,右为通高事件流 rail —— 监控板的心跳靠右一直在跳。 */}
      <div className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
        <div className='flex flex-col gap-4 lg:col-span-2'>
          <ActivityChart data={mapped.activity} />
          <Breakdowns
            reasons={mapped.reasons}
            types={mapped.types}
            topIps={mapped.topIps}
          />
        </div>
        <EventTape
          events={recent}
          paused={stream.paused}
          onTogglePaused={stream.togglePaused}
          freshId={stream.freshId}
        />
      </div>

      <EventsTable events={recent} />
    </div>
  )
}
