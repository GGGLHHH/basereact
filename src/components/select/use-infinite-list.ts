import { useInfiniteQuery, type QueryKey } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'

/**
 * Cursor pagination response envelope for APIs that expose `next_cursor`.
 * Empty backend pages may return `items: null`; this hook normalizes them.
 */
export interface InfiniteCursorPage<TItem> {
  items: TItem[] | null
  nextCursor?: string
}

/**
 * Cursor pagination fields injected on every page request.
 */
export interface InfiniteCursorPaginationParams {
  cursor?: string
  limit: number
}

/**
 * Common options for domain-specific infinite list hooks.
 */
export interface BaseInfiniteListOptions {
  /** Page size. Defaults to 20. */
  pageSize?: number
  /** Forwarded to react-query. */
  enabled?: boolean
  staleTime?: number
  gcTime?: number
}

export interface UseInfiniteCursorListOptions<
  TItem,
  TExtraParams extends object = object,
> extends BaseInfiniteListOptions {
  /** The query key must include meaningful `baseParams` differences. */
  queryKey: QueryKey
  /** Single-page fetcher. The hook merges `limit`, `cursor`, and `baseParams`. */
  queryFn: (
    params: TExtraParams & InfiniteCursorPaginationParams,
  ) => Promise<InfiniteCursorPage<TItem>>
  /** Domain filters. Changes must also be reflected in `queryKey`. */
  baseParams?: TExtraParams
}

/**
 * Minimal adapter props consumed by `InfiniteSelect`.
 */
export interface InfiniteSelectAdapterProps<TItem> {
  items: TItem[]
  isLoading: boolean
  isFetchingNextPage: boolean
  hasNextPage: boolean
  isError: boolean
  onLoadMore: () => void
  onRetry: () => void
}

const DEFAULT_PAGE_SIZE = 20

const EMPTY_ITEMS: readonly never[] = Object.freeze([])

/**
 * Wraps `useInfiniteQuery` for cursor-based list APIs that expose `next_cursor`.
 *
 * Keyset pagination is the fit for select-like infinite scroll: stable under
 * concurrent inserts and O(log n) deep, with no total to compute. APIs that seed
 * the first keyset page with an empty cursor should default it in their `queryFn`
 * (the hook omits `cursor` when there's no page param).
 */
export function useInfiniteCursorList<TItem, TExtraParams extends object = object>(
  options: UseInfiniteCursorListOptions<TItem, TExtraParams>,
): InfiniteSelectAdapterProps<TItem> {
  const {
    queryKey,
    queryFn,
    baseParams,
    pageSize = DEFAULT_PAGE_SIZE,
    enabled,
    staleTime,
    gcTime,
  } = options

  const query = useInfiniteQuery({
    enabled,
    ...(gcTime !== undefined && { gcTime }),
    ...(staleTime !== undefined && { staleTime }),
    queryKey,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      queryFn({
        ...((baseParams ?? {}) as TExtraParams),
        limit: pageSize,
        ...(pageParam ? { cursor: pageParam } : {}),
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  })

  const items = useMemo<TItem[]>(() => {
    if (!query.data) return EMPTY_ITEMS as unknown as TItem[]
    const out: TItem[] = []
    for (const page of query.data.pages) {
      if (page.items?.length) out.push(...page.items)
    }
    return out
  }, [query.data])

  const fetchNextPage = useCallback((): void => {
    void query.fetchNextPage()
  }, [query])
  const refetch = useCallback((): void => {
    void query.refetch()
  }, [query])

  return useMemo<InfiniteSelectAdapterProps<TItem>>(
    () => ({
      items,
      isLoading: query.isLoading,
      isFetchingNextPage: query.isFetchingNextPage,
      hasNextPage: query.hasNextPage,
      isError: query.isError,
      onLoadMore: fetchNextPage,
      onRetry: refetch,
    }),
    [
      items,
      query.isLoading,
      query.isFetchingNextPage,
      query.hasNextPage,
      query.isError,
      fetchNextPage,
      refetch,
    ],
  )
}
