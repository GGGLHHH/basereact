import { useControllableValue } from 'ahooks'
import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  type ChangeEvent,
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
  emptyLabel?: ReactNode
  loadingLabel?: ReactNode
  loadingMoreLabel?: ReactNode
  errorLabel?: ReactNode
  retryLabel?: ReactNode

  maxListHeight?: number
  className?: string
  footer?: ReactNode
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
  isLoading: boolean
  isFetchingNextPage: boolean
  hasNextPage: boolean
  isError: boolean
  onRetry?: () => void
  getOption: (item: T) => InfiniteSelectOption
  renderItem?: (params: InfiniteSelectItemRenderParams<T>) => ReactNode
  isMultiple: boolean
  isSelected: (id: string) => boolean
  onSelect: (item: T, option: InfiniteSelectOption) => void
  sentinelRef: RefObject<HTMLDivElement | null>
  emptyLabel: ReactNode
  loadingLabel: ReactNode
  loadingMoreLabel: ReactNode
  errorLabel: ReactNode
  retryLabel: ReactNode
}

function InfiniteSelectList<T>({
  items,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  isError,
  onRetry,
  getOption,
  renderItem,
  isMultiple,
  isSelected,
  onSelect,
  sentinelRef,
  emptyLabel,
  loadingLabel,
  loadingMoreLabel,
  errorLabel,
  retryLabel,
}: InfiniteSelectListProps<T>) {
  if (isError) {
    return (
      <div className='flex flex-col items-center gap-2 px-2 py-4 text-sm text-muted-foreground'>
        <span>{errorLabel}</span>
        {onRetry && (
          <Button
            onClick={onRetry}
            size='sm'
            variant='outline'
          >
            {retryLabel}
          </Button>
        )}
      </div>
    )
  }

  if (isLoading) {
    return <div className='px-2 py-3 text-sm text-muted-foreground'>{loadingLabel}</div>
  }

  if (items.length === 0) {
    return <div className='px-2 py-3 text-sm text-muted-foreground'>{emptyLabel}</div>
  }

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
                  'flex size-4 shrink-0 items-center justify-center rounded-lg border transition-colors',
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
      {isFetchingNextPage && (
        <div className='px-2 py-1.5 text-center text-xs text-muted-foreground'>
          {loadingMoreLabel}
        </div>
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
    emptyLabel = 'No results',
    loadingLabel = 'Loading…',
    loadingMoreLabel = 'Loading more…',
    errorLabel = 'Failed to load',
    retryLabel = 'Retry',
    maxListHeight = 256,
    className,
    footer,
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

  // Announce list-state transitions to assistive tech while typeahead filters,
  // without moving focus or re-reading the options.
  const statusMessage = isError
    ? errorLabel
    : isLoading
      ? loadingLabel
      : items.length === 0
        ? emptyLabel
        : isFetchingNextPage
          ? loadingMoreLabel
          : null

  return (
    <div
      className={cn(
        'flex w-full flex-col rounded-md border border-border bg-popover text-popover-foreground shadow-md',
        className,
      )}
      data-slot='infinite-select'
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

      <div
        aria-live='polite'
        className='sr-only'
        role='status'
      >
        {statusMessage}
      </div>

      <ScrollArea
        viewportStyle={{ maxHeight: maxListHeight, overflowY: 'auto' }}
        viewportRef={viewportRef}
      >
        <div className='p-1'>
          <InfiniteSelectList
            emptyLabel={emptyLabel}
            errorLabel={errorLabel}
            getOption={getOption}
            hasNextPage={hasNextPage}
            isError={isError}
            isFetchingNextPage={isFetchingNextPage}
            isLoading={isLoading}
            isMultiple={isMultiple}
            isSelected={isSelected}
            items={items}
            loadingLabel={loadingLabel}
            loadingMoreLabel={loadingMoreLabel}
            onRetry={onRetry}
            onSelect={handleSelect}
            renderItem={renderItem}
            retryLabel={retryLabel}
            sentinelRef={sentinelRef}
          />
        </div>
      </ScrollArea>
      {footer}
    </div>
  )
}
