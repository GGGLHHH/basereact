import { useControllableValue } from 'ahooks'
import { type Dispatch, type SetStateAction } from 'react'

export interface ControllableStateOptions<T> {
  /** 受控值。传了(非 undefined)即受控:state 恒等于此 prop。 */
  value?: T
  /** 非受控初始值。 */
  defaultValue?: T
  /** 值变化回调(受控/非受控都触发),入参为下一个值。 */
  onChange?: (value: T) => void
}

/**
 * `useControllableValue` 的 useState 化包装:签名与语义都对齐 React `useState`。
 *
 * - 返回 `[state, setState]`,`setState` 是 `Dispatch<SetStateAction<T>>` —— 收值或
 *   `(prev) => next` 更新器,identity 跨渲染稳定,可安全进依赖数组。
 * - `value` 存在 ⇒ 受控(state 跟 prop 走,`setState` 只触发 `onChange`);否则非受控
 *   (内部持有 state)。这与受控/非受控 input 的 React 惯例一致。
 * - `fallback` 给非受控且无 `defaultValue` 时的初值,保证返回 `T`(非 `T | undefined`)。
 *
 * 为什么要包一层:ahooks 原 API 用「props 对象 + 字符串 propName options」配置,setter
 * 还带多余可变参,和 `useState` 长得不一样。这里收敛成 useState 同形,调用处即插即换。
 */
export function useControllableState<T>(
  options: ControllableStateOptions<T> & { fallback: T },
): [T, Dispatch<SetStateAction<T>>]
export function useControllableState<T>(
  options: ControllableStateOptions<T>,
): [T | undefined, Dispatch<SetStateAction<T | undefined>>]
export function useControllableState<T>({
  value,
  defaultValue,
  onChange,
  fallback,
}: ControllableStateOptions<T> & { fallback?: T }): [T, Dispatch<SetStateAction<T>>] {
  // 只在有值时挂键:ahooks 用 hasOwnProperty('value') 判受控,若把 undefined 也塞进去
  // 会被误判成「受控但值为 undefined」,输入框就锁死在 undefined。
  const props: ControllableStateOptions<T> = {}
  if (value !== undefined) props.value = value
  if (defaultValue !== undefined) props.defaultValue = defaultValue
  if (onChange) props.onChange = onChange

  return useControllableValue<T>(props, fallback === undefined ? {} : { defaultValue: fallback })
}
