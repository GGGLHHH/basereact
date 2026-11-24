import type { DataTableColumn } from '@gedatou/cadenza-ui'
import type { TFunction } from 'i18next'
import type { LogRecordView } from '#/generated/api-types'

import {
  Badge,
  Button,
  DataTable,
  DataTableEmpty,
  DataTableLoadingOverlay,
  Dialog,
  DialogHeader,
  DialogPopup,
  DialogTitle,
  ScrollArea,
  SearchField,
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from '@gedatou/cadenza-ui'
import { getRouteApi } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { AppDataPagination } from '@/components/table/app-data-pagination'

import { useMonitoringLogs } from './data'
import { hm, ms, stamp } from './format'

const routeApi = getRouteApi('/admin/_shell/monitoring')

const floorMinute = () => Math.floor(Date.now() / 60_000) * 60_000

/** 当前整分时间戳,每分钟更新一次。 */
function useCurrentMinute(): number {
  const [minute, setMinute] = useState(floorMinute)
  useEffect(() => {
    const id = setInterval(() => setMinute(floorMinute()), 60_000)
    return () => clearInterval(id)
  }, [])
  return minute
}

const SPAN_MINUTES = { '1h': 60, '24h': 24 * 60, '7d': 7 * 24 * 60, '15d': 15 * 24 * 60 } as const
type Span = keyof typeof SPAN_MINUTES
/** 表格行高:满页刚好铺满(同登录审计表)。 */
const ROW_H = 52

function LevelBadge({ severity }: { severity: LogRecordView['severity'] }) {
  const { t } = useTranslation('common')
  return (
    <Badge variant={severity === 'ERROR' ? 'destructive' : 'outline'}>
      {t(`monitoring.logs.levels.${severity}`)}
    </Badge>
  )
}

/** 结构化字段的前几项(`k=v`),让"request rejected"这类简短消息也看得出原因。 */
/** 长字段(调用栈、UA)不进表格里的摘要,只在详情里看。 */
const LONG_ATTRS = new Set(['stack', 'user_agent'])

function attrSummary(r: LogRecordView, max = 3): string | null {
  const parts = Object.entries(r.attributes)
    .filter(([k]) => !LONG_ATTRS.has(k))
    .slice(0, max)
    .map(([k, v]) => `${k}=${typeof v === 'string' ? v : JSON.stringify(v)}`)
  return parts.length === 0 ? null : parts.join(' ')
}

function requestSummary(r: LogRecordView): string | null {
  if (r.method == null && r.route == null)
    return null
  const parts = [r.method, r.route, r.status == null ? null : String(r.status), r.duration_ms == null ? null : ms(r.duration_ms)]
  return parts.filter(p => p != null && p !== '').join(' · ')
}

function columns(
  t: TFunction<'common'>,
  onRequestId: (rid: string) => void,
): DataTableColumn<LogRecordView>[] {
  const cols: DataTableColumn<LogRecordView>[] = [
    {
      id: 'ts',
      header: t('monitoring.logs.time'),
      rowHeader: true,
      width: 150,
      cell: r => <span className='font-mono text-xs whitespace-nowrap'>{stamp(r.ts)}</span>,
    },
    { id: 'level', header: t('monitoring.logs.level'), width: 72, cell: r => <LevelBadge severity={r.severity} /> },
  ]
  cols.push({
    id: 'service',
    header: t('monitoring.logs.service'),
    width: 64,
    cell: r => <span className='font-mono text-xs'>{r.service}</span>,
  })
  cols.push(
    {
      id: 'body',
      header: t('monitoring.logs.message'),
      // 不封顶的话,长消息会把表撑宽、把请求 ID 列挤出视野;完整内容点行看详情。
      maxWidth: 560,
      cell: (r) => {
        const req = requestSummary(r)
        const attrs = attrSummary(r)
        return (
          <span className='flex min-w-0 flex-col'>
            <span
              className='block truncate'
              title={r.body}
            >
              {r.body}
              {attrs != null ? <span className='ml-2 font-mono text-xs text-muted-foreground'>{attrs}</span> : null}
            </span>
            <span className='truncate font-mono text-xs text-muted-foreground'>
              {r.target}
              {req != null ? ` · ${req}` : ''}
            </span>
          </span>
        )
      },
    },
    {
      id: 'rid',
      header: t('monitoring.logs.requestId'),
      width: 120,
      cell: r => (r.request_id == null
        ? <span className='text-muted-foreground'>—</span>
        : (
            <button
              type='button'
              className='max-w-28 truncate font-mono text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline'
              title={t('monitoring.logs.filterByRequest')}
              onClick={(e) => {
                e.stopPropagation()
                onRequestId(r.request_id ?? '')
              }}
            >
              {r.request_id.slice(0, 8)}
            </button>
          )),
    },
  )
  return cols
}

/** 一条日志的全部字段(含脱敏后的结构化字段)。 */
function LogDetail({ log, onClose }: { log: LogRecordView | null, onClose: () => void }) {
  const { t } = useTranslation('common')
  const rows: [string, string][] = log == null
    ? []
    : [
        [t('monitoring.logs.time'), stamp(log.ts)],
        [t('monitoring.logs.level'), t(`monitoring.logs.levels.${log.severity}`)],
        [t('monitoring.logs.service'), t(`monitoring.logs.services.${log.service}`)],
        [t('monitoring.logs.instance'), log.instance],
        [t('monitoring.logs.source'), log.target],
        [t('monitoring.logs.requestId'), log.request_id ?? '—'],
        [t('monitoring.logs.request'), requestSummary(log) ?? '—'],
      ]
  // 调用栈单独按原样多行显示,其余结构化字段放 JSON 里。
  const stack = typeof log?.attributes.stack === 'string' ? log.attributes.stack : null
  const rest = log == null ? {} : Object.fromEntries(Object.entries(log.attributes).filter(([k]) => k !== 'stack'))
  const attrs = Object.keys(rest).length > 0 ? JSON.stringify(rest, null, 2) : null
  return (
    <Dialog
      open={log != null}
      onOpenChange={(open) => {
        if (!open)
          onClose()
      }}
    >
      <DialogPopup className='sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>{t('monitoring.logs.detail')}</DialogTitle>
        </DialogHeader>
        {log != null
          ? (
              <div className='flex min-w-0 flex-col gap-3 text-sm'>
                <p className='wrap-break-word whitespace-pre-wrap'>{log.body}</p>
                <dl className='grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs'>
                  {rows.map(([k, v]) => (
                    <div
                      key={k}
                      className='contents'
                    >
                      <dt className='text-muted-foreground'>{k}</dt>
                      <dd className='min-w-0 font-mono break-all'>{v}</dd>
                    </div>
                  ))}
                </dl>
                {stack != null
                  ? (
                      <ScrollArea className='max-h-64 rounded-md border border-border'>
                        <pre className='p-3 font-mono text-xs break-all whitespace-pre-wrap'>{stack}</pre>
                      </ScrollArea>
                    )
                  : null}
                {attrs != null
                  ? (
                      <ScrollArea className='max-h-64 rounded-md border border-border'>
                        <pre className='p-3 font-mono text-xs break-all whitespace-pre-wrap'>{attrs}</pre>
                      </ScrollArea>
                    )
                  : null}
              </div>
            )
          : null}
      </DialogPopup>
    </Dialog>
  )
}

export function LogsPanel() {
  const { t } = useTranslation('common')
  const search = routeApi.useSearch()
  const navigate = routeApi.useNavigate()
  const [selected, setSelected] = useState<LogRecordView | null>(null)
  // 翻页 / 筛选只改 search,留在原位(见 router.tsx 的滚动约定)。
  const update = (patch: Partial<typeof search>) =>
    void navigate({ resetScroll: false, search: prev => ({ ...prev, page: 1, ...patch }) })

  const explicit = search.from !== undefined || search.to !== undefined
  // 没有指定时间段时按"最近 N"查:起点取整到分钟(每分钟前进一次),查询键一分钟内稳定。
  const minute = useCurrentMinute()
  const spanFrom = new Date(minute - SPAN_MINUTES[search.span] * 60_000).toISOString()
  const logs = useMonitoringLogs({
    from: explicit ? search.from : spanFrom,
    to: explicit ? search.to : undefined,
    level: search.level === 'all' ? undefined : search.level,
    service: search.service === 'all' ? undefined : search.service,
    q: search.q || undefined,
    requestId: search.rid || undefined,
    page: search.page,
    size: search.size,
  })
  const cols = useMemo(
    () => columns(t, rid => update({ rid })),
    // eslint-disable-next-line react/exhaustive-deps -- update 每次渲染新建,但只读最新 search,不影响列定义
    [t],
  )
  const pageInfo = logs.data?.page_info
  const total = pageInfo?.mode === 'offset' ? (pageInfo.total ?? 0) : 0
  const items = logs.data?.items ?? []

  const levelItems = [
    { value: 'all', label: t('monitoring.logs.allLevels') },
    { value: 'ERROR', label: t('monitoring.logs.errorsOnly') },
  ]
  const spanItems = (Object.keys(SPAN_MINUTES) as Span[]).map(s => ({ value: s, label: t(`monitoring.logs.span.${s}`) }))
  const serviceItems = [
    { value: 'all', label: t('monitoring.logs.allServices') },
    { value: 'app', label: t('monitoring.logs.services.app') },
    { value: 'idm', label: t('monitoring.logs.services.idm') },
    { value: 'web', label: t('monitoring.logs.services.web') },
  ]

  return (
    <section className='flex flex-col gap-3'>
      <div className='flex flex-wrap items-center gap-2'>
        {explicit
          ? (
              <Badge
                variant='secondary'
                className='gap-1.5'
              >
                {t('monitoring.logs.window', { from: search.from === undefined ? '…' : stamp(search.from), to: search.to === undefined ? '…' : hm(search.to) })}
                <button
                  type='button'
                  aria-label={t('monitoring.logs.clearWindow')}
                  className='text-muted-foreground hover:text-foreground'
                  onClick={() => update({ from: undefined, to: undefined })}
                >
                  ×
                </button>
              </Badge>
            )
          : (
              <Select
                items={spanItems}
                value={search.span}
                onValueChange={(v) => {
                  if (v !== null)
                    update({ span: v })
                }}
              >
                <SelectTrigger
                  size='sm'
                  className='w-32'
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectPopup>
                  {spanItems.map(i => (
                    <SelectItem
                      key={i.value}
                      value={i.value}
                    >
                      {i.label}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            )}
        <Select
          items={levelItems}
          value={search.level}
          onValueChange={(v) => {
            if (v !== null)
              update({ level: v })
          }}
        >
          <SelectTrigger
            size='sm'
            className='w-32'
          >
            <SelectValue />
          </SelectTrigger>
          <SelectPopup>
            {levelItems.map(i => (
              <SelectItem
                key={i.value}
                value={i.value}
              >
                {i.label}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
        <Select
          items={serviceItems}
          value={search.service}
          onValueChange={(v) => {
            if (v !== null)
              update({ service: v })
          }}
        >
          <SelectTrigger
            size='sm'
            className='w-36'
          >
            <SelectValue />
          </SelectTrigger>
          <SelectPopup>
            {serviceItems.map(i => (
              <SelectItem
                key={i.value}
                value={i.value}
              >
                {i.label}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
        <div className='w-60'>
          <SearchField
            defaultValue={search.q}
            onQueryValueChange={v => update({ q: v ?? '' })}
            placeholder={t('monitoring.logs.search')}
          />
        </div>
        <div className='w-48'>
          <SearchField
            key={search.rid}
            defaultValue={search.rid}
            onQueryValueChange={v => update({ rid: v ?? '' })}
            placeholder={t('monitoring.logs.requestIdPlaceholder')}
          />
        </div>
        <Button
          variant='outline'
          size='sm'
          className='ml-auto'
          onClick={() => void logs.refetch()}
        >
          {t('monitoring.logs.refresh')}
        </Button>
      </div>

      <DataTable
        aria-label={t('monitoring.logs.title')}
        columns={cols}
        items={items}
        getRowId={r => String(r.id)}
        isLoading={logs.isPending}
        maxHeight={40 + ROW_H * search.size}
        onRowAction={setSelected}
      >
        <DataTableEmpty>{t('monitoring.logs.empty')}</DataTableEmpty>
        <DataTableLoadingOverlay>{t('loading.loading')}</DataTableLoadingOverlay>
      </DataTable>
      <AppDataPagination
        limit={search.size}
        page={search.page}
        total={total}
        count={items.length}
        onLimitChange={size => update({ size })}
        onPageChange={page => void navigate({ resetScroll: false, search: prev => ({ ...prev, page }) })}
      />
      <LogDetail
        log={selected}
        onClose={() => setSelected(null)}
      />
    </section>
  )
}
