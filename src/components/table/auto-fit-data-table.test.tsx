// @vitest-environment happy-dom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AutoFitDataTable } from './auto-fit-data-table'

// 自适应高度靠 ResizeObserver + getBoundingClientRect 驱动,happy-dom 两者都不真量。
// 所以这里不验「量得准不准」(那要真实布局),只验开关语义:显式给了 maxHeight 就
// 完全不测量。这条守的是 AutoFitDataTable 存在的理由本身 —— 迁移到 cadenza 后
// 库版只有固定 maxHeight,这层包装是本仓库唯一自持的部分。
const observed: unknown[] = []

class MockResizeObserver {
  observe(target: unknown) {
    observed.push(target)
  }

  unobserve() {}
  disconnect() {}
}

const ITEMS = [{ id: '1', name: 'Ada' }]
const COLUMNS = [{ id: 'name', header: 'Name', cell: (item: typeof ITEMS[number]) => item.name }]

beforeEach(() => {
  observed.length = 0
  vi.stubGlobal('ResizeObserver', MockResizeObserver)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function countObservedFor(maxHeight?: number): number {
  observed.length = 0
  render(
    <AutoFitDataTable
      aria-label='Widgets'
      columns={COLUMNS}
      items={ITEMS}
      maxHeight={maxHeight}
    />,
  )
  // 渲染确实发生了,计数才有意义。
  expect(screen.getByText('Ada')).not.toBeNull()
  const count = observed.length
  cleanup()
  return count
}

describe('autoFitDataTable', () => {
  it('only observes layout when maxHeight is omitted', () => {
    // cadenza 的 DataTable 内部自己也挂 ResizeObserver,所以断的是差值而不是绝对值:
    // 显式给了 maxHeight,这层包装必须一个观察器都不额外挂。
    const withExplicitHeight = countObservedFor(320)
    const withAutoFit = countObservedFor()

    expect(withAutoFit).toBeGreaterThan(withExplicitHeight)
  })
})
