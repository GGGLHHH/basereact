import { useControllableValue } from 'ahooks'
import {
  createContext,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ChangeEvent,
  type ComponentProps,
  type ReactNode,
  type RefObject,
} from 'react'

import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/scroll-area'
import { cn } from '@/lib/utils'

export interface InfiniteSelectOption {
  id: string
  label: ReactNode
  disabled?: boolean
}

/**
 * Context exposed to custom item renderers.
 */
export interface InfiniteSelectItemRenderParams<T> {
  item: T
  option: InfiniteSelectOption
  selected: boolean
  isMultiple: boolean
  onSelect: () => void
}

interface InfiniteSelectCommonProps<T> {
  items: T[]

  isLoading?: boolean
  isFetchingNextPage?: boolean
  hasNextPage?: boolean
  isError?: boolean

  onLoadMore?: () => void
  onRetry?: () => void

  onSearchInputValueChange?: (value: string) => void
  searchInputValue?: string

  getOption: (item: T) => InfiniteSelectOption

  /**
   * Replaces the default item row while keeping selection state and actions.
   */
  renderItem?: (params: InfiniteSelectItemRenderParams<T>) => ReactNode

  searchPlaceholder?: string

  maxListHeight?: number
  className?: string
  /**
   * 唯一插槽通道:状态插槽(`InfiniteSelectEmpty`/`Loading`/`Error`/`LoadingMore`,context 驱动、
   * 按状态自渲染)+ 底部条(`InfiniteSelectFooter`,作为最后一个子天然落底)。底层零文案 —— 文案由
   * 上层(业务组件)注入,零 i18n 侵入。footer 不再是单独 prop(与状态插槽同一组合模式)。
   */
  children?: ReactNode
}

/**
 * Controlled/uncontrolled selection props for single and multi-select modes.
 */
export type ControllableSelectionProps<TItem = unknown> =
  | {
      multiple: true
      value?: string[]
      defaultValue?: string[]
      /**
       * `ids` is the authoritative selection (every toggled id), while `items`
       * only holds the objects that were actually loaded — a preselected id from
       * an unloaded page has an id but no item. Persist `ids`, not `items`.
       */
      onChange?: (items: TItem[], ids: string[]) => void
    }
  | {
      multiple?: false
      value?: string
      defaultValue?: string
      onChange?: (item: TItem | undefined) => void
    }

export type InfiniteSelectProps<T> = InfiniteSelectCommonProps<T> & ControllableSelectionProps<T>

interface InfiniteSelectListProps<T> {
  items: T[]
  hasNextPage: boolean
  getOption: (item: T) => InfiniteSelectOption
  renderItem?: (params: InfiniteSelectItemRenderParams<T>) => ReactNode
  isMultiple: boolean
  isSelected: (id: string) => boolean
  onSelect: (item: T, option: InfiniteSelectOption) => void
  sentinelRef: RefObject<HTMLDivElement | null>
}

/** 列表状态消息容器(空/加载/错误/加载更多共用):muted 文字 + `data-slot` + `role=status`(a11y 播报)。 */
export function InfiniteSelectStatus({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('px-2 py-3 text-sm text-muted-foreground', className)}
      data-slot='infinite-select-status'
      role='status'
      {...props}
    />
  )
}

// ── 列表状态插槽:context 驱动、底层零文案。状态互斥,同一时刻至多一个 InfiniteSelectStatus 渲染
//    (role=status 不冲突);文案由上层(业务组件)用这些部件组合注入。 ──
interface InfiniteSelectState {
  isLoading: boolean
  isError: boolean
  isEmpty: boolean
  isFetchingNextPage: boolean
  onRetry?: () => void
}

const InfiniteSelectStateContext = createContext<InfiniteSelectState | null>(null)

function useInfiniteSelectState(): InfiniteSelectState {
  const ctx = useContext(InfiniteSelectStateContext)
  if (!ctx) {
    throw new Error('InfiniteSelect 状态插槽必须用在 InfiniteSelect 的 children 内')
  }
  return ctx
}

/** 空态插槽:无结果时显示 children。 */
export function InfiniteSelectEmpty({ className, ...props }: ComponentProps<'div'>) {
  const { isEmpty } = useInfiniteSelectState()
  return isEmpty ? (
    <InfiniteSelectStatus
      className={className}
      {...props}
    />
  ) : null
}

/** 加载态插槽:首屏加载时显示 children。 */
export function InfiniteSelectLoading({ className, ...props }: ComponentProps<'div'>) {
  const { isLoading } = useInfiniteSelectState()
  return isLoading ? (
    <InfiniteSelectStatus
      className={className}
      {...props}
    />
  ) : null
}

/** 加载更多插槽:拉下一页时显示在列表底部。 */
export function InfiniteSelectLoadingMore({ className, ...props }: ComponentProps<'div'>) {
  const { isFetchingNextPage } = useInfiniteSelectState()
  return isFetchingNextPage ? (
    <InfiniteSelectStatus
      className={cn('py-1.5 text-center text-xs', className)}
      {...props}
    />
  ) : null
}

/** 错误态插槽:容器(内部放错误文案 + `InfiniteSelectRetry`)。 */
export function InfiniteSelectError({ className, ...props }: ComponentProps<'div'>) {
  const { isError } = useInfiniteSelectState()
  return isError ? (
    <InfiniteSelectStatus
      className={cn('flex flex-col items-center gap-2 py-4', className)}
      {...props}
    />
  ) : null
}

/** 重试按钮:调用底层 `onRetry`(无则不渲染)。放进 `InfiniteSelectError` 内,文案走 children。 */
export function InfiniteSelectRetry({
  className,
  onClick,
  ...props
}: ComponentProps<typeof Button>) {
  const { onRetry } = useInfiniteSelectState()
  if (!onRetry) {
    return null
  }
  return (
    <Button
      className={className}
      data-slot='infinite-select-retry'
      onClick={(event) => {
        onRetry()
        onClick?.(event)
      }}
      size='sm'
      type='button'
      variant='outline'
      {...props}
    />
  )
}

function InfiniteSelectList<T>({
  items,
  hasNextPage,
  getOption,
  renderItem,
  isMultiple,
  isSelected,
  onSelect,
  sentinelRef,
}: InfiniteSelectListProps<T>) {
  return (
    <>
      {items.map((item) => {
        const option = getOption(item)
        const selected = isSelected(option.id)
        const handleSelect = () => onSelect(item, option)

        if (renderItem) {
          return (
            <Fragment key={option.id}>
              {renderItem({ item, option, selected, isMultiple, onSelect: handleSelect })}
            </Fragment>
          )
        }

        return (
          <button
            key={option.id}
            aria-pressed={selected}
            data-selected={selected ? '' : undefined}
            disabled={option.disabled}
            onClick={handleSelect}
            type='button'
            className={cn(
              'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm/5 text-popover-foreground transition-colors',
              'hover:bg-muted focus-visible:bg-muted focus-visible:outline-none',
              !isMultiple && selected && 'bg-muted',
              option.disabled && 'cursor-not-allowed opacity-50',
            )}
          >
            {isMultiple && (
              <span
                aria-hidden
                data-slot='infinite-select-checkbox'
                className={cn(
                  'flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors',
                  selected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input bg-background text-transparent',
                )}
              >
                {selected && <span className='i-lucide-check size-3' />}
              </span>
            )}
            <span className='min-w-0 flex-1 truncate'>{option.label}</span>
            {!isMultiple && selected && (
              <span className='i-lucide-check size-4 shrink-0 text-primary' />
            )}
          </button>
        )
      })}

      {hasNextPage && (
        <div
          ref={sentinelRef}
          aria-hidden
          className='h-px'
        />
      )}
    </>
  )
}

/**
 * Searchable list content for single and multi-select popovers.
 */
export function InfiniteSelect<T>(props: InfiniteSelectProps<T>) {
  const {
    items,
    isLoading = false,
    isFetchingNextPage = false,
    hasNextPage = false,
    isError = false,
    onLoadMore,
    onRetry,
    onSearchInputValueChange,
    searchInputValue,
    getOption,
    renderItem,
    searchPlaceholder = 'Search',
    maxListHeight = 256,
    className,
    children,
  } = props

  const isMultiple = props.multiple === true

  const [selectedValue, setSelectedValue] = useControllableValue<string | string[] | undefined>(
    props,
    { defaultValue: isMultiple ? [] : undefined, trigger: '__infinite_select_no_op__' },
  )

  // Only multi mode reads this cache (to echo already-selected items across
  // pages); single mode never does, so skip the per-render scan there.
  const selectedItemsCacheRef = useRef<Map<string, T>>(new Map())

  if (isMultiple) {
    const selectedIds = (selectedValue as string[] | undefined) ?? []
    for (const item of items) {
      const id = getOption(item).id
      if (selectedIds.includes(id)) {
        selectedItemsCacheRef.current.set(id, item)
      }
    }
  }

  const [searchDraft, setSearchDraft] = useControllableValue<string>(
    {
      onSearchInputValueChange,
      searchInputValue,
    },
    {
      defaultValue: '',
      trigger: 'onSearchInputValueChange',
      valuePropName: 'searchInputValue',
    },
  )

  const handleSearchInput = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setSearchDraft(event.target.value)
    },
    [setSearchDraft],
  )

  const isSelected = useCallback(
    (id: string): boolean => {
      if (isMultiple) return ((selectedValue as string[] | undefined) ?? []).includes(id)
      return (selectedValue as string | undefined) === id
    },
    [isMultiple, selectedValue],
  )

  const handleSelect = useCallback(
    (item: T, option: InfiniteSelectOption) => {
      if (option.disabled) return

      if (props.multiple) {
        const currentIds = (selectedValue as string[] | undefined) ?? []
        const isToggleOff = currentIds.includes(option.id)
        const nextIds = isToggleOff
          ? currentIds.filter((id) => id !== option.id)
          : [...currentIds, option.id]

        if (isToggleOff) {
          selectedItemsCacheRef.current.delete(option.id)
        } else {
          selectedItemsCacheRef.current.set(option.id, item)
        }

        setSelectedValue(nextIds)

        const nextItems = nextIds
          .map((id) => selectedItemsCacheRef.current.get(id))
          .filter((entry): entry is T => entry !== undefined)
        // `nextIds` is authoritative (includes unloaded ids); `nextItems` is a
        // best-effort echo of the loaded ones.
        props.onChange?.(nextItems, nextIds)
        return
      }

      const currentId = selectedValue as string | undefined
      const isToggleOff = currentId === option.id
      setSelectedValue(isToggleOff ? undefined : option.id)
      props.onChange?.(isToggleOff ? undefined : item)
    },
    [selectedValue, setSelectedValue, props],
  )

  const viewportRef = useRef<HTMLDivElement | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const onLoadMoreRef = useRef(onLoadMore)
  useEffect(() => {
    onLoadMoreRef.current = onLoadMore
  }, [onLoadMore])

  useEffect(() => {
    const sentinel = sentinelRef.current
    const root = viewportRef.current
    if (!sentinel || !hasNextPage || isFetchingNextPage) return
    if (typeof IntersectionObserver === 'undefined') return

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadMoreRef.current?.()
        }
      },
      { root, rootMargin: '64px' },
    )
    io.observe(sentinel)
    return () => io.disconnect()
  }, [hasNextPage, isFetchingNextPage])

  // 状态互斥:空态 = 非加载 / 非错误 / 无结果;有结果才渲染滚动列表。a11y 播报由各状态插槽的
  // `role=status` 承担(见 InfiniteSelectStatus),不再单独维护 sr-only 文案。
  const isEmpty = !isLoading && !isError && items.length === 0
  const hasItems = !isLoading && !isError && items.length > 0

  return (
    <div
      className={cn(
        'flex w-full flex-col rounded-md border border-border bg-popover text-popover-foreground shadow-md',
        className,
      )}
      data-slot='infinite-select'
    >
      <InfiniteSelectStateContext.Provider
        value={{ isLoading, isError, isEmpty, isFetchingNextPage, onRetry }}
      >
        <div
          className='flex items-center gap-2 border-b border-border px-3'
          data-slot='infinite-select-search'
        >
          <span className='i-lucide-search size-4 shrink-0 text-muted-foreground' />
          <input
            aria-label={typeof searchPlaceholder === 'string' ? searchPlaceholder : 'Search'}
            className='min-w-0 flex-1 bg-transparent py-2 text-sm/5 text-popover-foreground outline-none placeholder:text-muted-foreground'
            onChange={handleSearchInput}
            placeholder={searchPlaceholder}
            type='text'
            value={searchDraft}
          />
        </div>

        {hasItems && (
          <ScrollArea
            viewportStyle={{ maxHeight: maxListHeight, overflowY: 'auto' }}
            viewportRef={viewportRef}
          >
            <div className='p-1'>
              <InfiniteSelectList
                getOption={getOption}
                hasNextPage={hasNextPage}
                isMultiple={isMultiple}
                isSelected={isSelected}
                items={items}
                onSelect={handleSelect}
                renderItem={renderItem}
                sentinelRef={sentinelRef}
              />
            </div>
          </ScrollArea>
        )}

        {/* 单通道:状态插槽 + 底部条(footer 作为最后一个子天然落底)。 */}
        {children}
      </InfiniteSelectStateContext.Provider>
    </div>
  )
}

// ── footer 动作(clear/close)：Context 定义在**底座层**,由上层 InfiniteCombobox 填值。
//    放低层是刻意的:infinite-combobox 已依赖 infinite-select,hook/部件住这里才不会反向 import 成环。 ──

/** footer 内可消费的选择器动作。上层(combobox)提供实现:clear=清选择、close=关弹层(含 commitOnClose 提交)。 */
export interface InfiniteSelectActions<T = unknown> {
  /** 已选项(仅已加载页的回显)。 */
  selectedItems: T[]
  /** 已选 id(权威全集,含未加载页)。 */
  selectedIds: string[]
  clear: () => void
  close: () => void
}

const InfiniteSelectActionsContext = createContext<InfiniteSelectActions | null>(null)

/** 上层用它把 actions 灌进 footer 子树。 */
export function InfiniteSelectActionsProvider<T>({
  value,
  children,
}: {
  value: InfiniteSelectActions<T>
  children: ReactNode
}) {
  return (
    <InfiniteSelectActionsContext.Provider value={value as InfiniteSelectActions}>
      {children}
    </InfiniteSelectActionsContext.Provider>
  )
}

/** 在 `InfiniteSelect` 的 `footer` 内取 clear/close/当前选择。用在 footer 之外会抛错(fail-fast)。 */
export function useInfiniteSelectActions<T = unknown>(): InfiniteSelectActions<T> {
  const ctx = useContext(InfiniteSelectActionsContext)
  if (!ctx) {
    throw new Error('useInfiniteSelectActions 必须用在 InfiniteSelect 的 footer 内')
  }
  return ctx as InfiniteSelectActions<T>
}

/** 弹层底部动作条容器(shadcn 薄部件:`data-slot` + `cn` 合并 + 透传)。塞进 `InfiniteSelect` 的 `footer`。 */
export function InfiniteSelectFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex items-center border-t border-border', className)}
      data-slot='infinite-select-footer'
      {...props}
    />
  )
}

/** 清除按钮:清空选择 + 关弹层(commitOnClose 下即提交空 → 过滤清掉)。标签走 children。 */
export function InfiniteSelectClearButton({
  className,
  onClick,
  ...props
}: ComponentProps<typeof Button>) {
  const { clear, close } = useInfiniteSelectActions()
  return (
    <Button
      className={cn('flex-1 rounded-none', className)}
      data-slot='infinite-select-clear'
      onClick={(event) => {
        clear()
        close()
        onClick?.(event)
      }}
      size='sm'
      type='button'
      variant='ghost'
      {...props}
    />
  )
}

/** 确认按钮:关弹层(commitOnClose 下即提交当前草稿)。标签走 children。 */
export function InfiniteSelectConfirmButton({
  className,
  onClick,
  ...props
}: ComponentProps<typeof Button>) {
  const { close } = useInfiniteSelectActions()
  return (
    <Button
      className={cn('flex-1 rounded-none', className)}
      data-slot='infinite-select-confirm'
      onClick={(event) => {
        close()
        onClick?.(event)
      }}
      size='sm'
      type='button'
      variant='ghost'
      {...props}
    />
  )
}
