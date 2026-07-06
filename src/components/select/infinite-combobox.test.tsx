// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { InfiniteCombobox, useInfiniteComboboxState } from './infinite-combobox'
import type { InfiniteSelectAdapterProps } from './use-infinite-list'

interface Item {
  id: string
  label: string
}

class MockIntersectionObserver implements IntersectionObserver {
  root: Element | Document | null = null
  rootMargin = ''
  scrollMargin = ''
  thresholds: ReadonlyArray<number> = []
  constructor(_cb: IntersectionObserverCallback) {}
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
}

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
  if (!(Element.prototype as { hasPointerCapture?: unknown }).hasPointerCapture) {
    Element.prototype.hasPointerCapture = vi.fn<() => boolean>(() => false)
    Element.prototype.releasePointerCapture = vi.fn<() => void>()
    Element.prototype.setPointerCapture = vi.fn<() => void>()
  }
  Element.prototype.scrollIntoView = vi.fn<() => void>()
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

function staticList(items: Item[]): InfiniteSelectAdapterProps<Item> {
  return {
    items,
    isLoading: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    isError: false,
    onLoadMore: () => {},
    onRetry: () => {},
  }
}

function MultiHarness({ onChange }: { onChange: (items: Item[], ids: string[]) => void }) {
  const state = useInfiniteComboboxState({ defaultOpen: true })
  return (
    <InfiniteCombobox<Item>
      multiple
      value={['a', 'b']}
      onChange={onChange}
      state={state}
      list={staticList([{ id: 'c', label: 'Gamma' }])}
      getOption={(item) => ({ id: item.id, label: item.label })}
    >
      <button type='button'>Open</button>
    </InfiniteCombobox>
  )
}

describe('InfiniteCombobox multi-select', () => {
  it('keeps preselected ids whose items were never loaded when toggling another', () => {
    // value=['a','b'] but only 'c' is in the loaded page — a,b have no item object.
    // Toggling 'c' must yield ids ['a','b','c'], not collapse to ['c'].
    const onChange = vi.fn<(items: Item[], ids: string[]) => void>()

    render(<MultiHarness onChange={onChange} />)

    fireEvent.click(screen.getByText('Gamma'))

    expect(onChange).toHaveBeenCalledTimes(1)
    const ids = onChange.mock.calls[0]?.[1]
    expect([...(ids ?? [])].sort()).toEqual(['a', 'b', 'c'])
  })
})
