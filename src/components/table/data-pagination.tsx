import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from '@/components/ui/pagination'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
} from '@tabler/icons-react'
import { useControllableValue } from 'ahooks'
import { useEffect } from 'react'

const DEFAULT_LIMIT_OPTIONS = [10, 20, 50, 100]
const NAV_BUTTON_CLASS =
  'h-8 w-8 rounded-lg border border-border bg-card p-0 text-foreground shadow-none transition-colors hover:bg-muted hover:text-foreground [&_svg]:h-4 [&_svg]:w-4'
const SELECT_TRIGGER_CLASS =
  'h-9 w-20 rounded-lg border-border bg-card px-3 text-sm font-normal text-foreground shadow-xs'
const TEXT_CLASS = 'whitespace-nowrap text-sm font-medium text-foreground'

interface DataPaginationProps {
  className?: string
  onLimitChange?: (limit: number) => void
  onPageChange?: (page: number) => void
  showLimitChanger?: boolean
  limitOptions?: number[]
  defaultLimit?: number
  defaultPage?: number
  limit?: number
  total: number
  page?: number
}

export function DataPagination(props: DataPaginationProps) {
  const { total, limitOptions = DEFAULT_LIMIT_OPTIONS, showLimitChanger = true, className } = props

  const [limit, setLimit] = useControllableValue<number>(props, {
    defaultValue: 20,
    defaultValuePropName: 'defaultLimit',
    valuePropName: 'limit',
    trigger: 'onLimitChange',
  })

  const [page, setPage] = useControllableValue<number>(props, {
    defaultValue: 1,
    defaultValuePropName: 'defaultPage',
    valuePropName: 'page',
    trigger: 'onPageChange',
  })

  // Guard against limit=0/NaN (e.g. parsed from an untrusted URL param):
  // unguarded division yields "Page 1 of Infinity" / dead NaN buttons.
  const totalPages = Number.isFinite(limit) && limit > 0 ? Math.max(1, Math.ceil(total / limit)) : 1
  const canPrevious = page > 1
  const canNext = page < totalPages

  // 仅在已知有数据且 page 越界时钳位到末页；total=0 视为「数据未加载完」，不要踩 page
  // （翻页瞬间 react-query 把 data 置 undefined，total 暂时为 0，否则会把 URL 闪回）
  useEffect(() => {
    if (total > 0 && page > totalPages) {
      setPage(totalPages)
    }
  }, [total, totalPages, page, setPage])

  const handleLimitChange = (value: string) => {
    setLimit(Number(value))
  }

  const goPrevious = () => {
    if (canPrevious) setPage(page - 1)
  }
  const goFirst = () => {
    if (canPrevious) setPage(1)
  }
  const goNext = () => {
    if (canNext) setPage(page + 1)
  }
  const goLast = () => {
    if (canNext) setPage(totalPages)
  }

  return (
    <div className={cn('flex items-center gap-8', className)}>
      {showLimitChanger && (
        <div className='flex items-center gap-2'>
          <span className={cn(TEXT_CLASS, 'pr-2')}>Rows per page</span>
          <Select
            value={String(limit)}
            onValueChange={(value) => {
              if (value) handleLimitChange(value)
            }}
          >
            <SelectTrigger
              aria-label='Rows per page'
              className={SELECT_TRIGGER_CLASS}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {limitOptions.map((size: number) => (
                  <SelectItem
                    key={size}
                    value={String(size)}
                  >
                    {size}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      )}

      <span className={cn(TEXT_CLASS, 'pr-2')}>
        Page {page} of {totalPages}
      </span>

      <Pagination className='mx-0 w-auto'>
        <PaginationContent className='gap-2'>
          <PaginationItem>
            <PaginationLink
              aria-label='Previous page'
              aria-disabled={!canPrevious}
              className={cn(NAV_BUTTON_CLASS, !canPrevious && 'pointer-events-none opacity-50')}
              onClick={goPrevious}
              size='icon'
            >
              <IconChevronLeft />
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink
              aria-label='First page'
              aria-disabled={!canPrevious}
              className={cn(NAV_BUTTON_CLASS, !canPrevious && 'pointer-events-none opacity-50')}
              onClick={goFirst}
              size='icon'
            >
              <IconChevronsLeft />
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink
              aria-label='Next page'
              aria-disabled={!canNext}
              className={cn(NAV_BUTTON_CLASS, !canNext && 'pointer-events-none opacity-50')}
              onClick={goNext}
              size='icon'
            >
              <IconChevronRight />
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink
              aria-label='Last page'
              aria-disabled={!canNext}
              className={cn(NAV_BUTTON_CLASS, !canNext && 'pointer-events-none opacity-50')}
              onClick={goLast}
              size='icon'
            >
              <IconChevronsRight />
            </PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}
