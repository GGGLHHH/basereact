import type { HistoryRange, InstanceRole } from '@/generated/api-types'

import { Tabs, TabsList, TabsTab } from '@gedatou/cadenza-ui'
import { getRouteApi } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

import { useMonitoring, useMonitoringHistory } from './-monitoring/data'
import { dayTime, hms } from './-monitoring/format'
import { instanceHealth } from './-monitoring/health'
import { InstanceHeader } from './-monitoring/instance-header'
import { KpiTiles } from './-monitoring/kpi-tiles'
import { LogsPanel } from './-monitoring/logs-panel'
import { HealthDot } from './-monitoring/status'
import { BackgroundPanels, DbTable, RoutesTable } from './-monitoring/tables'
import { TrendCharts } from './-monitoring/trend-charts'

// 组件与路由定义分文件:路由文件只导出 Route(代码分割 / fast refresh),见 tanstack-route-page-split。
const routeApi = getRouteApi('/admin/_shell/monitoring')

/** 实时数据的采样间隔(秒),1 小时范围下点击曲线时作为时间段长度。 */
const LIVE_STEP_SECS = 15

export function MonitoringPage() {
  const { t } = useTranslation('common')
  const search = routeApi.useSearch()
  const navigate = routeApi.useNavigate()
  const live = useMonitoring()
  const instances = live.data?.instances ?? []
  const [selected, setSelected] = useState<InstanceRole | null>(null)
  const current = instances.find(i => i.role === selected) ?? instances[0]

  const range = search.range
  const historyRange: HistoryRange | null = range === '1h' ? null : range
  const history = useMonitoringHistory(historyRange)
  const hist = historyRange === null ? undefined : history.data
  const histInstance = hist?.instances.find(i => i.role === current?.role)

  const points = hist === undefined ? (current?.history ?? []) : (histInstance?.points ?? [])
  const routes = hist === undefined ? (current?.routes ?? []) : (histInstance?.routes ?? [])
  const dbOps = hist === undefined ? (current?.db_operations ?? []) : (histInstance?.db_operations ?? [])
  const stepSecs = hist?.step_secs ?? LIVE_STEP_SECS

  let notice: string | undefined
  if (hist !== undefined && !hist.persistent)
    notice = t('monitoring.charts.notPersistent')
  else if (hist !== undefined && hist.details_from > hist.from)
    notice = t('monitoring.charts.detailsSince', { from: dayTime(hist.details_from) })

  const setSearch = (patch: Partial<typeof search>, resetScroll = false) =>
    void navigate({ resetScroll, search: prev => ({ ...prev, ...patch }) })

  return (
    <div className='flex flex-col gap-4'>
      <header className='flex flex-wrap items-end justify-between gap-3'>
        <div className='space-y-1'>
          <h1 className='text-lg font-semibold tracking-tight'>{t('monitoring.title')}</h1>
          <p className='text-sm text-muted-foreground'>{t('monitoring.subtitle')}</p>
        </div>
        <div className='flex items-center gap-3'>
          {instances.length > 1 && search.tab === 'overview'
            ? (
                <Tabs
                  value={current?.role}
                  onValueChange={value => setSelected(value as InstanceRole)}
                >
                  <TabsList>
                    {instances.map(i => (
                      <TabsTab
                        key={i.role}
                        value={i.role}
                        className='gap-1.5'
                      >
                        <HealthDot health={instanceHealth(i)} />
                        {t(`monitoring.roles.${i.role}`)}
                      </TabsTab>
                    ))}
                  </TabsList>
                </Tabs>
              )
            : null}
          <span className='inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground'>
            <span
              aria-hidden
              className={cn('inline-block size-1.5 rounded-full', live.isError ? 'bg-auth-fail' : 'bg-auth-success')}
            />
            {live.data != null
              ? t('monitoring.updatedAt', { time: hms(live.data.generated_at) })
              : t('monitoring.loading')}
          </span>
        </div>
      </header>

      <Tabs
        value={search.tab}
        onValueChange={value => setSearch({ tab: value as 'overview' | 'logs' }, true)}
      >
        <TabsList>
          <TabsTab value='overview'>{t('monitoring.tabs.overview')}</TabsTab>
          <TabsTab value='logs'>{t('monitoring.tabs.logs')}</TabsTab>
        </TabsList>
      </Tabs>

      {live.isError && live.data == null
        ? <Card className='p-6 text-center text-sm text-auth-fail'>{t('monitoring.loadFailed')}</Card>
        : null}

      {search.tab === 'logs'
        ? <LogsPanel />
        : current != null
          ? (
              <>
                <InstanceHeader instance={current} />
                {current.reachable
                  ? (
                      <>
                        <KpiTiles instance={current} />
                        <TrendCharts
                          history={points}
                          range={range}
                          onRangeChange={r => setSearch({ range: r })}
                          stepSecs={stepSecs}
                          loading={historyRange !== null && history.isPending}
                          notice={notice}
                          onPick={(at, step) => {
                            const to = new Date(Date.parse(at) + step * 1000).toISOString()
                            setSearch({ tab: 'logs', from: at, to, page: 1 }, true)
                          }}
                        />
                        <div className='grid grid-cols-1 gap-4 2xl:grid-cols-5'>
                          <div className='min-w-0 2xl:col-span-3'>
                            <RoutesTable routes={routes} />
                          </div>
                          <div className='min-w-0 2xl:col-span-2'>
                            <DbTable ops={dbOps} />
                          </div>
                        </div>
                        <BackgroundPanels instance={current} />
                      </>
                    )
                  : null}
              </>
            )
          : null}
    </div>
  )
}
