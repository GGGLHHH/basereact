import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type {
  Column,
  ColumnDef,
  ColumnPinningState,
  Table as TableType,
  TableMeta,
} from '@tanstack/react-table'
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { ScrollArea } from '@/components/scroll-area'
import { Spinner } from '@/components/ui/spinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/table'

import { DataPagination } from './data-pagination'
import { useScrollShadow } from './scroll-shadow'

const TABLE_ROW_HEIGHT = 53
const TABLE_HEADER_HEIGHT = 40
const AUTO_FIT_MIN_HEIGHT = TABLE_HEADER_HEIGHT + TABLE_ROW_HEIGHT * 3
const AUTO_FIT_SAFETY_BUFFER = 4
const INFINITE_SCROLL_THRESHOLD_PX = 64

const DEFAULT_CARD_CLASSNAME = 'rounded-[8px] border border-border bg-card shadow-xs'
const GALLERY_CARD_CLASSNAME =
  'overflow-hidden rounded-[28px] border border-border bg-card shadow-sm'

export type DataTableVariant = 'default' | 'gallery'

export interface DataTableLoading {
  isLoading: boolean
  text: string
}

export interface DataTableInfiniteScroll {
  hasNextPage: boolean
  isFetchingNextPage: boolean
  loadingMoreLabel?: ReactNode
  onLoadMore: () => void
}

export interface DataTablePaginationState {
  className?: string
  containerClassName?: string
  count?: number
  limit: number
  onLimitChange?: (limit: number) => void
  onPageChange?: (page: number) => void
  page: number
  showLimitChanger?: boolean
  summary?: (state: { count: number; limit: number; page: number; total: number }) => ReactNode
  summaryClassName?: string
  total: number
}

export interface DataTableProps<TData> {
  className?: string
  columns: ColumnDef<TData, any>[]
  data: TData[]
  emptyMessage?: string
  infiniteScroll?: DataTableInfiniteScroll
  loading?: DataTableLoading
  maxHeight?: number
  meta?: TableMeta<TData>
  onRowClick?: (row: TData) => void
  pagination?: DataTablePaginationState
  pinnedColumns?: ColumnPinningState
  rowHeight?: number
  showScrollShadow?: boolean
  variant?: DataTableVariant
}

const STABLE_ANCESTOR_SLOTS = new Set([
  'scroll-area-viewport',
  'sidebar-inset',
  'dialog-content',
  'sheet-content',
  'drawer-content',
  'popover-content',
])

function getColumnDefId<TData>(columnDef: ColumnDef<TData, any>): string | undefined {
  if (columnDef.id) return columnDef.id

  const accessorKey = (columnDef as { accessorKey?: unknown }).accessorKey
  if (typeof accessorKey === 'string') return accessorKey.replace(/\./g, '_')
  if (typeof accessorKey === 'number') return String(accessorKey)

  return typeof columnDef.header === 'string' ? columnDef.header : undefined
}

function hasExplicitColumnSizing<TData>(columnDef: ColumnDef<TData, any>): boolean {
  return (
    columnDef.size !== undefined ||
    columnDef.minSize !== undefined ||
    columnDef.maxSize !== undefined
  )
}

function getExplicitlySizedColumnIds<TData>(columns: ColumnDef<TData, any>[]): Set<string> {
  const ids = new Set<string>()

  const collect = (columnDefs: ColumnDef<TData, any>[]) => {
    for (const columnDef of columnDefs) {
      const id = getColumnDefId(columnDef)
      if (id && hasExplicitColumnSizing(columnDef)) {
        ids.add(id)
      }

      const childColumns = (columnDef as { columns?: ColumnDef<TData, any>[] }).columns
      if (childColumns) {
        collect(childColumns)
      }
    }
  }

  collect(columns)
  return ids
}

function findLimitedHeightAncestor(start: HTMLElement): HTMLElement {
  let cur: HTMLElement | null = start.parentElement
  while (cur && cur !== document.body) {
    const slot = cur.dataset.slot
    if (slot && STABLE_ANCESTOR_SLOTS.has(slot)) return cur
    cur = cur.parentElement
  }
  return document.documentElement
}

function measureReservedAfter(start: HTMLElement, end: HTMLElement): number {
  let reserved = 0
  let cur: HTMLElement = start

  while (cur.parentElement && cur !== end) {
    const parent = cur.parentElement
    const parentStyle = window.getComputedStyle(parent)
    const children = Array.from(parent.children) as HTMLElement[]
    const idx = children.indexOf(cur)
    if (idx < 0) break

    let prevBottom = cur.getBoundingClientRect().bottom
    for (let i = idx + 1; i < children.length; i++) {
      const sibling = children[i]
      const sStyle = window.getComputedStyle(sibling)
      if (
        sStyle.display === 'none' ||
        sStyle.position === 'absolute' ||
        sStyle.position === 'fixed'
      ) {
        continue
      }
      const sRect = sibling.getBoundingClientRect()
      const gap = sRect.top - prevBottom
      if (gap > 0) reserved += gap
      reserved += sRect.height
      prevBottom = sRect.bottom
    }

    if (parent !== end) {
      reserved += parseFloat(parentStyle.paddingBottom) || 0
    }

    cur = parent
  }

  return reserved
}

function computeAutoFitHeight(container: HTMLElement, safetyBuffer: number): number {
  const ancestor = findLimitedHeightAncestor(container)
  const containerRect = container.getBoundingClientRect()
  const reserved = measureReservedAfter(container, ancestor)
  // documentElement's height includes the table itself, so measuring its rect
  // feeds our own height back into the computation (2px/frame ratchet collapse
  // in document-flow layouts). The viewport is the stable bound there.
  const ancestorBottom =
    ancestor === document.documentElement
      ? window.innerHeight
      : ancestor.getBoundingClientRect().bottom
  return ancestorBottom - containerRect.top - reserved - safetyBuffer
}

interface UseAutoFitHeightOptions {
  enabled: boolean
  minHeight: number
  safetyBuffer: number
}

function useAutoFitHeight(
  containerRef: React.RefObject<HTMLElement | null>,
  { enabled, minHeight, safetyBuffer }: UseAutoFitHeightOptions,
): number | undefined {
  const [height, setHeight] = useState<number | undefined>(undefined)

  useEffect(() => {
    if (!enabled) {
      setHeight(undefined)
      return
    }
    const container = containerRef.current
    if (!container || typeof window === 'undefined') return

    let rafId = 0
    const ancestor = findLimitedHeightAncestor(container)

    const recompute = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        const node = containerRef.current
        if (!node) return
        const next = computeAutoFitHeight(node, safetyBuffer)
        setHeight(Math.max(Math.round(next), minHeight))
      })
    }

    const observer = new ResizeObserver(recompute)

    let cur: HTMLElement | null = container
    const observed = new Set<Element>()
    const observe = (el: Element) => {
      if (observed.has(el)) return
      observed.add(el)
      observer.observe(el)
    }
    observe(container)
    while (cur && cur !== ancestor.parentElement) {
      observe(cur)
      const parent = cur.parentElement
      if (parent) {
        const children = Array.from(parent.children)
        const idx = children.indexOf(cur)
        for (let i = idx + 1; i < children.length; i++) observe(children[i])
      }
      if (cur === ancestor) break
      cur = cur.parentElement
    }

    const ancestorScrollOff = (() => {
      if (ancestor === document.documentElement) return () => {}
      ancestor.addEventListener('scroll', recompute, { passive: true })
      return () => ancestor.removeEventListener('scroll', recompute)
    })()

    window.addEventListener('resize', recompute)
    recompute()

    return () => {
      cancelAnimationFrame(rafId)
      observer.disconnect()
      ancestorScrollOff()
      window.removeEventListener('resize', recompute)
    }
  }, [enabled, minHeight, safetyBuffer, containerRef])

  return height
}

type PinnedCellLayer = 'body' | 'header'

function getPinnedColumnStyle<TData>(
  column: Column<TData, unknown>,
  layer: PinnedCellLayer,
  explicitlySizedColumnIds: Set<string>,
): CSSProperties {
  const width = column.getSize()
  const pinned = column.getIsPinned()
  const shouldApplyWidth = Boolean(pinned) || explicitlySizedColumnIds.has(column.id)
  const baseStyle: CSSProperties = shouldApplyWidth
    ? {
        boxSizing: 'border-box',
        maxWidth: width,
        minWidth: width,
        width,
      }
    : {
        boxSizing: 'border-box',
      }

  if (!pinned) return baseStyle

  // Background lives in classes (see PINNED_BODY_CELL_CLASSNAME / the header's
  // bg-muted): an opaque inline background would paint over the row's
  // hover/selected tint and can't follow theme tokens like bg-card.
  return {
    ...baseStyle,
    left: pinned === 'left' ? `${column.getStart('left')}px` : undefined,
    position: 'sticky',
    right: pinned === 'right' ? `${column.getAfter('right')}px` : undefined,
    zIndex: layer === 'header' ? 30 : 20,
  }
}

const PINNED_BODY_CELL_CLASSNAME = 'bg-card transition-colors [tr:hover_&]:bg-muted'

interface DataTableSurfaceProps<TData> {
  className?: string
  emptyMessage: string
  explicitlySizedColumnIds: Set<string>
  infiniteScroll?: DataTableInfiniteScroll
  maxHeight?: number
  onRowClick?: (row: TData) => void
  rowHeight: number
  showScrollShadow: boolean
  table: TableType<TData>
}

function DataTableSurface<TData>({
  className = DEFAULT_CARD_CLASSNAME,
  emptyMessage,
  explicitlySizedColumnIds,
  infiniteScroll,
  maxHeight,
  onRowClick,
  rowHeight,
  showScrollShadow,
  table,
}: DataTableSurfaceProps<TData>) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const tableHeaderRef = useRef<HTMLTableSectionElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const rows = table.getRowModel().rows
  const hasData = rows.length > 0

  const leftPinnedWidth = table
    .getLeftLeafColumns()
    .reduce((total, column) => total + column.getSize(), 0)
  const rightPinnedWidth = table
    .getRightLeafColumns()
    .reduce((total, column) => total + column.getSize(), 0)
  const shadowWrapperRef = useScrollShadow({
    horizontalShadowOffset: {
      left: leftPinnedWidth,
      right: rightPinnedWidth,
    },
    scrollContainerSelector: '[data-slot="scroll-area-viewport"]',
    showVerticalShadows: true,
    topShadowOffset: TABLE_HEADER_HEIGHT,
  })

  const setContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      containerRef.current = node
      if (showScrollShadow) {
        shadowWrapperRef(node)
      }
    },
    [shadowWrapperRef, showScrollShadow],
  )

  const isAutoFit = maxHeight === undefined
  const autoFitHeight = useAutoFitHeight(containerRef, {
    enabled: isAutoFit,
    minHeight: AUTO_FIT_MIN_HEIGHT,
    safetyBuffer: AUTO_FIT_SAFETY_BUFFER,
  })

  const effectiveHeight = maxHeight ?? autoFitHeight ?? TABLE_HEADER_HEIGHT + TABLE_ROW_HEIGHT * 10

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => rowHeight,
    overscan: 10,
    enabled: hasData,
  })

  const virtualItems = rowVirtualizer.getVirtualItems()
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0
  const paddingBottom =
    virtualItems.length > 0
      ? rowVirtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end
      : 0

  const onLoadMoreRef = useRef(infiniteScroll?.onLoadMore)
  const infiniteScrollRef = useRef(infiniteScroll)
  onLoadMoreRef.current = infiniteScroll?.onLoadMore
  infiniteScrollRef.current = infiniteScroll

  const infiniteScrollEnabled = infiniteScroll !== undefined
  const isFetchingNextPage = infiniteScroll?.isFetchingNextPage ?? false

  // In-flight latch: scroll events can fire many times before the parent
  // re-renders with isFetchingNextPage=true, and each stale read would re-fire
  // onLoadMore. Latched here, released when the prop reports the fetch settled.
  const loadMorePendingRef = useRef(false)
  useEffect(() => {
    if (!isFetchingNextPage) {
      loadMorePendingRef.current = false
    }
  }, [isFetchingNextPage])

  useEffect(() => {
    const scrollEl = scrollContainerRef.current
    if (!scrollEl || !infiniteScrollEnabled) {
      return
    }

    const maybeLoadMore = () => {
      const config = infiniteScrollRef.current
      if (!config?.hasNextPage || config.isFetchingNextPage || loadMorePendingRef.current) {
        return
      }

      const distanceFromBottom = scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight
      if (distanceFromBottom <= INFINITE_SCROLL_THRESHOLD_PX) {
        loadMorePendingRef.current = true
        onLoadMoreRef.current?.()
      }
    }

    scrollEl.addEventListener('scroll', maybeLoadMore, { passive: true })

    // A short page never scrolls, so no scroll event would ever fire — check
    // eagerly on mount and whenever the row set changes. Skip unmeasured
    // layouts (scrollHeight 0, e.g. jsdom) where "at bottom" is meaningless.
    if (scrollEl.scrollHeight > 0) {
      maybeLoadMore()
    }

    return () => scrollEl.removeEventListener('scroll', maybeLoadMore)
  }, [infiniteScrollEnabled, rows.length])

  return (
    <div
      ref={setContainerRef}
      className={cn('relative overflow-hidden', className)}
      data-slot='data-table-container'
    >
      <ScrollArea
        className='size-full'
        orientation='both'
        showScrollbars={false}
        viewportClassName='scrollbar-hidden overflow-auto'
        viewportRef={scrollContainerRef}
        viewportStyle={{
          maxHeight: `${effectiveHeight}px`,
          overflowX: 'auto',
          overflowY: 'auto',
        }}
      >
        <Table containerClassName='overflow-visible'>
          <TableHeader
            ref={tableHeaderRef}
            className='bg-muted'
          >
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header, idx, arr) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      'sticky top-0 z-10 bg-muted',
                      idx === 0 && 'rounded-tl-md',
                      idx === arr.length - 1 && 'rounded-tr-md',
                    )}
                    style={getPinnedColumnStyle(header.column, 'header', explicitlySizedColumnIds)}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className='[&_tr:last-child]:border-b-0!'>
            {hasData ? (
              <>
                {paddingTop > 0 && (
                  <tr>
                    <td style={{ height: `${paddingTop}px` }} />
                  </tr>
                )}
                {virtualItems.map((virtualRow) => {
                  const row = rows[virtualRow.index]
                  return (
                    <TableRow
                      key={row.id}
                      className={cn(
                        'transition-colors hover:bg-muted',
                        onRowClick ? 'cursor-pointer' : '',
                      )}
                      data-state={row.getIsSelected() && 'selected'}
                      onClick={() => onRowClick?.(row.original)}
                      style={{ height: `${rowHeight}px` }}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className={cn(cell.column.getIsPinned() && PINNED_BODY_CELL_CLASSNAME)}
                          style={getPinnedColumnStyle(
                            cell.column,
                            'body',
                            explicitlySizedColumnIds,
                          )}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  )
                })}
                {paddingBottom > 0 && (
                  <tr>
                    <td style={{ height: `${paddingBottom}px` }} />
                  </tr>
                )}
              </>
            ) : (
              <TableRow>
                <TableCell
                  className='h-24 text-center'
                  colSpan={table.getAllLeafColumns().length}
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollArea>
      {infiniteScroll?.isFetchingNextPage && infiniteScroll.loadingMoreLabel ? (
        <p className='py-3 text-center text-xs text-muted-foreground'>
          {infiniteScroll.loadingMoreLabel}
        </p>
      ) : null}
    </div>
  )
}

/**
 * Slimmed replacement for xchangeai-web's LoadingOverlay (which pulls i18n):
 * loading branch only, ui/Spinner based. `loading.text` stays the injection
 * point for custom copy.
 */
function TableLoadingOverlay({
  children,
  isLoading,
  text,
}: {
  children: ReactNode
  isLoading: boolean
  text?: string
}) {
  return (
    <div className='relative'>
      {children}
      {isLoading ? (
        <div className='absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 rounded-md bg-background/50 backdrop-blur-sm'>
          <Spinner className='size-8' />
          {text ? <p className='text-sm font-medium text-muted-foreground'>{text}</p> : null}
        </div>
      ) : null}
    </div>
  )
}

export function DataTable<TData>({
  className,
  columns,
  data,
  emptyMessage = 'No data',
  infiniteScroll,
  loading,
  maxHeight,
  meta,
  onRowClick,
  pagination,
  pinnedColumns,
  rowHeight = TABLE_ROW_HEIGHT,
  showScrollShadow = true,
  variant = 'default',
}: DataTableProps<TData>) {
  const explicitlySizedColumnIds = useMemo(() => getExplicitlySizedColumnIds(columns), [columns])
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    initialState: pinnedColumns ? { columnPinning: pinnedColumns } : undefined,
    manualPagination: Boolean(pagination),
    meta,
  })

  // initialState only applies on first render; keep pinning reactive to prop
  // changes (async user prefs, responsive breakpoints). Keyed on content, not
  // object identity, so inline literals don't re-pin every parent render.
  const pinnedColumnsKey = JSON.stringify(pinnedColumns ?? null)
  useEffect(() => {
    table.setColumnPinning(pinnedColumns ?? {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, pinnedColumnsKey])

  const chromeClassName =
    className ?? (variant === 'gallery' ? GALLERY_CARD_CLASSNAME : DEFAULT_CARD_CLASSNAME)
  const count = pagination?.count ?? data.length
  const tableContent = (
    <DataTableSurface
      className={chromeClassName}
      emptyMessage={emptyMessage}
      explicitlySizedColumnIds={explicitlySizedColumnIds}
      infiniteScroll={infiniteScroll}
      maxHeight={maxHeight}
      rowHeight={rowHeight}
      showScrollShadow={showScrollShadow}
      table={table}
      onRowClick={onRowClick}
    />
  )

  return (
    <>
      {/* Always wrapped: conditionally swapping the child's component type
          would remount the whole surface (scroll reset, virtualizer restart)
          every time `loading` toggles between undefined and an object. */}
      <TableLoadingOverlay
        isLoading={loading?.isLoading ?? false}
        text={loading?.text}
      >
        {tableContent}
      </TableLoadingOverlay>
      {pagination ? (
        <div
          className={cn('flex items-center justify-between gap-4', pagination.containerClassName)}
        >
          {pagination.summary ? (
            <div className={cn('text-sm text-muted-foreground', pagination.summaryClassName)}>
              {pagination.summary({
                count,
                limit: pagination.limit,
                page: pagination.page,
                total: pagination.total,
              })}
            </div>
          ) : null}
          <DataPagination
            className={pagination.className}
            limit={pagination.limit}
            page={pagination.page}
            showLimitChanger={pagination.showLimitChanger}
            total={pagination.total}
            onLimitChange={pagination.onLimitChange}
            onPageChange={pagination.onPageChange}
          />
        </div>
      ) : null}
    </>
  )
}
