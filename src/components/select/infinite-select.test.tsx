// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  InfiniteSelect,
  InfiniteSelectEmpty,
  InfiniteSelectError,
  InfiniteSelectLoading,
  InfiniteSelectRetry,
  type InfiniteSelectOption,
} from './infinite-select'

Element.prototype.scrollIntoView = vi.fn<() => void>()

afterEach(() => {
  cleanup()
})

const getOption = (item: { id: string; label: string }): InfiniteSelectOption => ({
  id: item.id,
  label: item.label,
})

// 状态插槽:context 驱动,按 InfiniteSelect 的状态自渲染;底层零文案,文案由 children 注入。
const slots = (
  <>
    <InfiniteSelectEmpty>No results</InfiniteSelectEmpty>
    <InfiniteSelectLoading>Loading</InfiniteSelectLoading>
    <InfiniteSelectError>
      Failed
      <InfiniteSelectRetry>Retry</InfiniteSelectRetry>
    </InfiniteSelectError>
  </>
)

describe('InfiniteSelect state slots', () => {
  it('shows the empty slot when there are no items (and nothing else)', () => {
    render(
      <InfiniteSelect
        getOption={getOption}
        items={[]}
      >
        {slots}
      </InfiniteSelect>,
    )
    expect(screen.getByText('No results')).not.toBeNull()
    expect(screen.queryByText('Loading')).toBeNull()
    expect(screen.queryByText('Failed')).toBeNull()
  })

  it('shows the loading slot (not empty) while first-page loading', () => {
    render(
      <InfiniteSelect
        getOption={getOption}
        isLoading
        items={[]}
      >
        {slots}
      </InfiniteSelect>,
    )
    expect(screen.getByText('Loading')).not.toBeNull()
    expect(screen.queryByText('No results')).toBeNull()
  })

  it('shows the error slot with a retry button wired to onRetry', () => {
    const onRetry = vi.fn<() => void>()
    render(
      <InfiniteSelect
        getOption={getOption}
        isError
        items={[]}
        onRetry={onRetry}
      >
        {slots}
      </InfiniteSelect>,
    )
    expect(screen.getByText('Failed')).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('renders items and hides state slots when loaded', () => {
    render(
      <InfiniteSelect
        getOption={getOption}
        items={[{ id: '1', label: 'Alice' }]}
      >
        {slots}
      </InfiniteSelect>,
    )
    expect(screen.getByText('Alice')).not.toBeNull()
    expect(screen.queryByText('No results')).toBeNull()
    expect(screen.queryByText('Loading')).toBeNull()
  })

  it('retry slot renders nothing when onRetry is absent', () => {
    render(
      <InfiniteSelect
        getOption={getOption}
        isError
        items={[]}
      >
        {slots}
      </InfiniteSelect>,
    )
    expect(screen.getByText('Failed')).not.toBeNull()
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull()
  })
})
