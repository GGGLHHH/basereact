// @vitest-environment happy-dom

import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useControllableState } from './use-controllable-state'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useControllableState', () => {
  it('uncontrolled: holds internal state, supports functional updater like useState', () => {
    const onChange = vi.fn<(v: number) => void>()
    const { result } = renderHook(() =>
      useControllableState<number>({ defaultValue: 1, onChange, fallback: 0 }),
    )
    expect(result.current[0]).toBe(1)

    act(() => result.current[1]((prev) => prev + 1)) // (prev) => next 更新器
    expect(result.current[0]).toBe(2)
    expect(onChange).toHaveBeenLastCalledWith(2)
  })

  it('uncontrolled without defaultValue: falls back to fallback', () => {
    const { result } = renderHook(() => useControllableState<string>({ fallback: '' }))
    expect(result.current[0]).toBe('')
  })

  it('controlled: state mirrors value prop; setState only fires onChange, no internal drift', () => {
    const onChange = vi.fn<(v: string) => void>()
    const { result, rerender } = renderHook(
      ({ value }) => useControllableState<string>({ value, onChange, fallback: '' }),
      { initialProps: { value: 'a' } },
    )
    expect(result.current[0]).toBe('a')

    act(() => result.current[1]('b'))
    expect(onChange).toHaveBeenCalledWith('b')
    expect(result.current[0]).toBe('a') // 受控:prop 未变,state 不自行漂移

    rerender({ value: 'b' })
    expect(result.current[0]).toBe('b') // prop 变即反映
  })

  it('setState identity is stable across renders (safe for dep arrays)', () => {
    const { result, rerender } = renderHook(() => useControllableState<number>({ fallback: 0 }))
    const first = result.current[1]
    rerender()
    expect(result.current[1]).toBe(first)
  })
})
