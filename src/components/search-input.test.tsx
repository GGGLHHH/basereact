// @vitest-environment happy-dom

import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SearchInput } from './search-input'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('SearchInput', () => {
  it('debounces and normalizes (trim → undefined) before emitting onSearch', () => {
    vi.useFakeTimers()
    const onSearch = vi.fn<(v: string | undefined) => void>()
    const { getByRole } = render(<SearchInput onSearch={onSearch} debounceMs={300} />)
    const input = getByRole('textbox')

    fireEvent.change(input, { target: { value: 'a' } })
    fireEvent.change(input, { target: { value: 'ab' } })
    expect(onSearch).not.toHaveBeenCalled() // 去抖窗口内不吐

    vi.advanceTimersByTime(300)
    expect(onSearch).toHaveBeenCalledExactlyOnceWith('ab') // 只吐最后一次

    fireEvent.change(input, { target: { value: '  ' } })
    vi.advanceTimersByTime(300)
    expect(onSearch).toHaveBeenLastCalledWith(undefined) // 空白归一为 undefined
  })

  it('is controllable: value mirrors the prop, onChange emits raw text', () => {
    const onChange = vi.fn<(v: string) => void>()
    const { getByRole, rerender } = render(
      <SearchInput value='a' onChange={onChange} onSearch={vi.fn()} />,
    )
    const input = getByRole('textbox') as HTMLInputElement
    expect(input.value).toBe('a')

    fireEvent.change(input, { target: { value: 'ab' } })
    expect(onChange).toHaveBeenCalledWith('ab') // 吐原始文本
    expect(input.value).toBe('a') // 受控:未回灌 prop 前不自行变

    rerender(<SearchInput value='ab' onChange={onChange} onSearch={vi.fn()} />)
    expect(input.value).toBe('ab') // prop 变即反映
  })
})
