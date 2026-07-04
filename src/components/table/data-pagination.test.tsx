// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DataPagination } from './data-pagination'

Element.prototype.scrollIntoView = vi.fn<() => void>()

afterEach(() => {
  cleanup()
})

describe('DataPagination', () => {
  it('renders copied limit controls and emits page changes', async () => {
    const handlePageChange = vi.fn<(page: number) => void>()

    const { container } = render(
      <DataPagination
        total={95}
        page={1}
        limit={10}
        onPageChange={handlePageChange}
      />,
    )

    expect(await screen.findByText('Rows per page')).not.toBeNull()
    expect(screen.getByText('Page 1 of 10')).not.toBeNull()

    fireEvent.click(within(container).getByLabelText('Next page'))

    expect(handlePageChange).toHaveBeenCalledWith(2)
  })

  it('uses 20 rows as the uncontrolled default limit', () => {
    render(<DataPagination total={95} />)

    expect(screen.getByText('Page 1 of 5')).not.toBeNull()
  })

  it('emits limit changes without a separate page reset', async () => {
    const handleLimitChange = vi.fn<(limit: number) => void>()
    const handlePageChange = vi.fn<(page: number) => void>()

    const { container } = render(
      <DataPagination
        total={95}
        page={1}
        limit={10}
        onLimitChange={handleLimitChange}
        onPageChange={handlePageChange}
      />,
    )

    fireEvent.click(within(container).getByRole('combobox'))
    const limitOption = await screen.findByRole('option', { name: '20' })
    fireEvent.pointerDown(limitOption)
    fireEvent.click(limitOption)

    expect(handleLimitChange).toHaveBeenCalledWith(20)
    expect(handlePageChange).not.toHaveBeenCalled()
  })

  // 翻页瞬间 react-query 把 data 置为 undefined，total 暂时回落到 0。
  // 此时不应把 page 拉回 1，否则 URL 会从 2 闪回 1，造成翻页失效。
  it('does not reset page to 1 while total is still loading (0)', () => {
    const handlePageChange = vi.fn<(page: number) => void>()

    render(
      <DataPagination
        total={0}
        page={2}
        limit={10}
        onPageChange={handlePageChange}
      />,
    )

    expect(handlePageChange).not.toHaveBeenCalled()
  })

  it('still resets page to 1 when current page exceeds totalPages after limit change', () => {
    const handlePageChange = vi.fn<(page: number) => void>()

    // total=15, limit=100 → totalPages=1，当前 page=2 越界，应该回 1
    render(
      <DataPagination
        total={15}
        page={2}
        limit={100}
        onPageChange={handlePageChange}
      />,
    )

    expect(handlePageChange).toHaveBeenCalledWith(1)
  })
})
