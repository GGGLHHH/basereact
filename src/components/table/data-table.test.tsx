// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createColumnHelper } from '@tanstack/react-table'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DataTable } from './data-table'

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: () => ({
    getTotalSize: () => 53,
    getVirtualItems: () => [{ end: 53, index: 0, key: '0', lane: 0, size: 53, start: 0 }],
  }),
}))

// scroll-shadow reads useTheme(); there is no ThemeProvider in tests.
vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light' }),
}))

interface RowData {
  id: string
  name: string
}

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const columnHelper = createColumnHelper<RowData>()
const columns = [
  columnHelper.accessor('name', {
    header: 'Name',
    cell: ({ getValue }) => getValue(),
    size: 720,
  }),
  columnHelper.display({
    id: 'actions',
    header: 'Actions',
    cell: () => 'Edit',
    size: 80,
  }),
]

const rows: RowData[] = [{ id: '1', name: 'NorthStar Realty Group' }]

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', MockResizeObserver)
})

afterEach(() => {
  vi.unstubAllGlobals()
  cleanup()
})

describe('DataTable', () => {
  it('creates the table instance and renders the shared scroll viewport', () => {
    const { container } = render(
      <DataTable
        columns={columns}
        data={rows}
        maxHeight={456}
      />,
    )

    const scrollArea = container.querySelector('[data-slot="scroll-area"]')
    const viewport = container.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement

    expect(scrollArea).toBeTruthy()
    expect(scrollArea?.getAttribute('data-orientation')).toBe('both')
    expect(viewport).toBeTruthy()
    expect(viewport.style.maxHeight).toBe('456px')
    expect(viewport.style.overflowX).toBe('auto')
    expect(viewport.style.overflowY).toBe('auto')
    expect(viewport.querySelector('[data-slot="table"]')).toBeTruthy()
    expect(screen.getByText('NorthStar Realty Group')).not.toBeNull()
  })

  it('wraps the table with loading and pagination chrome', () => {
    const handlePageChange = vi.fn<(page: number) => void>()
    const handleLimitChange = vi.fn<(limit: number) => void>()

    const { container } = render(
      <DataTable
        columns={columns}
        data={rows}
        loading={{ isLoading: true, text: 'Loading table' }}
        pagination={{
          count: rows.length,
          limit: 10,
          onLimitChange: handleLimitChange,
          onPageChange: handlePageChange,
          page: 1,
          summary: ({ count, total }) => `${count} of ${total}`,
          total: 95,
        }}
      />,
    )

    expect(screen.getByText('Loading table')).not.toBeNull()
    expect(screen.getByText('1 of 95')).not.toBeNull()
    expect(screen.getByText('Rows per page')).not.toBeNull()

    fireEvent.click(within(container).getByLabelText('Next page'))

    expect(handlePageChange).toHaveBeenCalledWith(2)
    expect(handleLimitChange).not.toHaveBeenCalled()
  })

  it('pins columns through the canonical table API', async () => {
    const { container } = render(
      <DataTable
        columns={columns}
        data={rows}
        pinnedColumns={{ left: ['name'], right: ['actions'] }}
      />,
    )

    const nameHeader = Array.from(container.querySelectorAll('[data-slot="table-head"]')).find(
      (cell) => cell.textContent === 'Name',
    ) as HTMLElement
    const actionHeader = Array.from(container.querySelectorAll('[data-slot="table-head"]')).find(
      (cell) => cell.textContent === 'Actions',
    ) as HTMLElement

    expect(nameHeader.style.position).toBe('sticky')
    expect(nameHeader.style.left).toBe('0px')
    expect(actionHeader.style.position).toBe('sticky')
    expect(actionHeader.style.right).toBe('0px')

    await waitFor(() => {
      const shadowStyle = Array.from(document.head.querySelectorAll('style')).find((style) =>
        style.textContent?.includes('show-right-shadow'),
      )
      const styleText = shadowStyle?.textContent ?? ''

      expect(styleText).toMatch(/::before\s*\{[\s\S]*left: 720px;/)
      expect(styleText).toMatch(/::after\s*\{[\s\S]*right: 80px;/)
    })
  })

  it('lets columns without explicit sizing fill remaining table width', () => {
    const mixedColumns = [
      columnHelper.accessor('name', {
        header: 'Name',
        cell: ({ getValue }) => getValue(),
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: () => 'Edit',
        size: 80,
      }),
    ]

    const { container } = render(
      <DataTable
        columns={mixedColumns}
        data={rows}
        maxHeight={456}
      />,
    )

    const nameHeader = Array.from(container.querySelectorAll('[data-slot="table-head"]')).find(
      (cell) => cell.textContent === 'Name',
    ) as HTMLElement
    const actionHeader = Array.from(container.querySelectorAll('[data-slot="table-head"]')).find(
      (cell) => cell.textContent === 'Actions',
    ) as HTMLElement
    const firstRowCells = Array.from(
      container.querySelectorAll('[data-slot="table-body"] [data-slot="table-cell"]'),
    ) as HTMLElement[]

    expect(nameHeader.style.width).toBe('')
    expect(nameHeader.style.minWidth).toBe('')
    expect(nameHeader.style.maxWidth).toBe('')
    expect(firstRowCells[0]?.style.width).toBe('')
    expect(firstRowCells[0]?.style.minWidth).toBe('')
    expect(firstRowCells[0]?.style.maxWidth).toBe('')

    expect(actionHeader.style.width).toBe('80px')
    expect(actionHeader.style.minWidth).toBe('80px')
    expect(actionHeader.style.maxWidth).toBe('80px')
    expect(firstRowCells[1]?.style.width).toBe('80px')
    expect(firstRowCells[1]?.style.minWidth).toBe('80px')
    expect(firstRowCells[1]?.style.maxWidth).toBe('80px')
  })

  it('does not call onLoadMore on mount', async () => {
    const onLoadMore = vi.fn()

    render(
      <DataTable
        columns={columns}
        data={rows}
        maxHeight={456}
        infiniteScroll={{
          hasNextPage: true,
          isFetchingNextPage: false,
          loadingMoreLabel: 'Loading more',
          onLoadMore,
        }}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('NorthStar Realty Group')).toBeTruthy()
    })

    expect(onLoadMore).not.toHaveBeenCalled()
  })

  it('calls onLoadMore when the scroll viewport reaches the bottom', async () => {
    const onLoadMore = vi.fn()
    const manyRows = Array.from({ length: 20 }, (_, index) => ({
      id: String(index + 1),
      name: `Row ${index + 1}`,
    }))

    const { container } = render(
      <DataTable
        columns={columns}
        data={manyRows}
        maxHeight={456}
        infiniteScroll={{
          hasNextPage: true,
          isFetchingNextPage: false,
          loadingMoreLabel: 'Loading more',
          onLoadMore,
        }}
      />,
    )

    const viewport = container.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement
    Object.defineProperty(viewport, 'scrollHeight', { configurable: true, value: 1000 })
    Object.defineProperty(viewport, 'clientHeight', { configurable: true, value: 400 })
    Object.defineProperty(viewport, 'scrollTop', { configurable: true, value: 0, writable: true })

    await waitFor(() => {
      expect(viewport).toBeTruthy()
    })

    viewport.scrollTop = 600
    fireEvent.scroll(viewport)
    expect(onLoadMore).toHaveBeenCalledOnce()
  })

  it('supports gallery chrome without a compatibility table view entry', () => {
    const { container } = render(
      <DataTable
        className='rounded-[28px]'
        columns={columns}
        data={rows}
        maxHeight={480}
        pagination={{
          className: 'justify-end',
          limit: 10,
          page: 1,
          showLimitChanger: false,
          total: 20,
        }}
        variant='gallery'
      />,
    )

    expect(container.querySelector('.rounded-\\[28px\\]')).not.toBeNull()
    expect(
      container.querySelector('[data-slot="scroll-area-viewport"]')?.getAttribute('style'),
    ).toContain('max-height: 480px')
    expect(screen.queryByText('Rows per page')).toBeNull()
    expect(container.querySelector('.justify-end')).not.toBeNull()
  })
})
