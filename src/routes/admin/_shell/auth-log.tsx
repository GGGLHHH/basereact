import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import type { AuthOutcome } from './-auth-log/types'

import { AuthEventTable } from '@/business/auth-log/table'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { ActivityChart } from './-auth-log/activity-chart'
import { Breakdowns } from './-auth-log/breakdowns'
import { mapStats, toAuthEvent, useAuthEventsList, useAuthEventsStats } from './-auth-log/data'
import { EventTape } from './-auth-log/event-tape'
import { KpiTiles } from './-auth-log/kpi-tiles'
import { useAuthEventStream, useLiveStats, useThrottledEvents } from './-auth-log/use-live'

const TABLE_SIZE = 20

// page/size 进 URL search(同 users 路由)。非法回默认(catch),缺失走 default(菜单跳本页
// 可省 search);size 上限对齐分页器选项 [10..100]。
const authLogSearchSchema = z.object({
  page: z.number().int().min(1).catch(1).default(1),
  size: z.number().int().min(1).max(100).catch(TABLE_SIZE).default(TABLE_SIZE),
})

export const Route = createFileRoute('/admin/_shell/auth-log')({
  component: AuthLogPage,
  validateSearch: authLogSearchSchema,
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

  // EventSource 拿不到响应状态码,连续失败几次分不清是网络抖一下还是会话真死了。借道
  // 一个已有的 ky 请求(stats.refetch)探一次——401 会走 api-client.ts 现成的刷新/跳登录
  // 梯子,SSE 自己的自动重连也会跟着恢复;真只是网络问题,这次探测也就白打一次,不影响什么。
  useEffect(() => {
    if (stream.errorStreak >= 3) {
      void stats.refetch()
    }
  }, [stream.errorStreak, stats])

  // tape 用 stream.events 原始未节流,事件到达即刻上 tape(乐观、不等)。
  // KPI/图表/分布这层重算+重渲染较贵,吃节流后的版本(见 use-live.ts 的 useThrottledEvents)。
  const throttledEvents = useThrottledEvents(stream.events)
  const base = useMemo(() => mapStats(stats.data), [stats.data])
  const mapped = useLiveStats(base, stats.dataUpdatedAt, throttledEvents)

  // tape + 表的近期事件:live 流置顶 + 列表首页(按 id 去重),封顶。
  const recent = useMemo(() => {
    const seed = (list.data?.items ?? []).map(toAuthEvent)
    const live = stream.events
    const seen = new Set(live.map((e) => e.id))
    return [...live, ...seed.filter((e) => !seen.has(e.id))].slice(0, 200)
  }, [stream.events, list.data])

  // 事件表:客户端过滤(结果 + 搜索 actor/ip)+ 切片分页。page/size 进 URL search(同 users
  // 路由),过滤(outcome/q)仍是本地态(搜索即输、不进 URL)。表纯展示,数据/分页由这层注入。
  const { page, size } = Route.useSearch()
  const navigate = Route.useNavigate()
  const [outcome, setOutcome] = useState<'all' | AuthOutcome>('all')
  const [q, setQ] = useState('')

  // 过滤变化回第一页;保留 size。
  const goPage = (p: number) => void navigate({ search: (prev) => ({ ...prev, page: p }) })

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return recent
      .filter((e) => outcome === 'all' || e.outcome === outcome)
      .filter(
        (e) =>
          !needle ||
          (e.actor ?? '').toLowerCase().includes(needle) ||
          e.ip.toLowerCase().includes(needle),
      )
  }, [recent, outcome, q])

  const pageRows = useMemo(
    () => filtered.slice((page - 1) * size, page * size),
    [filtered, page, size],
  )

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

      <KpiTiles kpi={mapped.kpi} />

      {/* 主区:左(活动 + 分布)占 2 栏,右为事件流 rail。零猜测等高:tape 的直接
          grid 子项是 `lg:relative` 这个空壳——它自己没有内容(内容在 absolute 里),
          对 grid 行高的自动计算贡献几乎是 0,所以行高**完全由左栏的天然内容高度决定**。
          定完行高,grid 默认 stretch 把这个空壳拉伸到跟左栏一样高(它没内容不影响
          "拉伸"这个动作本身);壳内 `lg:absolute lg:inset-0` 的层精确填满这个刚被拉
          伸出来的高度,EventTape 在里面 h-full + 内部 overflow-y-auto 滚动。全程没有
          任何写死的像素/rem——不管左栏内容变多变少,右栏永远精确等高,tape 内部滚动
          兜底多余的行。lg 以下堆叠单列,两层壳都不吃 relative/absolute,退化成普通块。 */}
      <div className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
        <div className='flex flex-col gap-4 lg:col-span-2'>
          <ActivityChart data={mapped.activity} />
          <Breakdowns
            reasons={mapped.reasons}
            types={mapped.types}
            topIps={mapped.topIps}
          />
        </div>
        <div className='lg:relative'>
          <div className='lg:absolute lg:inset-0'>
            <EventTape
              events={recent}
              paused={stream.paused}
              onTogglePaused={stream.togglePaused}
              freshId={stream.freshId}
            />
          </div>
        </div>
      </div>

      <div className='flex flex-col gap-3'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <h2 className='text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase'>
            {t('authLog.table.title')}
          </h2>
          <div className='flex items-center gap-2'>
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                goPage(1)
              }}
              placeholder={t('authLog.table.search')}
              className='h-8 w-44 font-mono text-xs'
            />
            <Select
              value={outcome}
              onValueChange={(v) => {
                setOutcome(v as typeof outcome)
                goPage(1)
              }}
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
        <AuthEventTable
          data={pageRows}
          isLoading={list.isPending}
          limit={size}
          page={page}
          total={filtered.length}
          onLimitChange={(l) => {
            void navigate({ search: { page: 1, size: l } })
          }}
          onPageChange={goPage}
        />
      </div>
    </div>
  )
}
