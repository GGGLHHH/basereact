import type { ComponentProps } from 'react'
import { useDebounceFn } from 'ahooks'

import { Input } from '@/components/ui/input'
import { useControllableState } from '@/hooks/use-controllable-state'
import { cn } from '@/lib/utils'

export interface SearchInputProps extends Omit<
  ComponentProps<typeof Input>,
  'value' | 'defaultValue' | 'onChange'
> {
  /** 受控:输入框文本。 */
  value?: string
  /** 非受控初始文本。 */
  defaultValue?: string
  /** 每次输入的原始文本(未去抖、未归一化)。 */
  onChange?: (value: string) => void
  /** 去抖后触发;已归一化(trim 后空串 → undefined),调用方直接落库/落 URL。 */
  onSearch: (value: string | undefined) => void
  /** 去抖间隔(ms),默认 300。 */
  debounceMs?: number
}

/**
 * 带去抖的搜索输入框。文本走 ahooks `useControllableValue` 受控/非受控双模;停顿
 * `debounceMs` 后把归一化值(trim → 空串变 undefined)吐给 `onSearch`。
 *
 * `onChange`(原始文本)即时触发,`onSearch`(归一化)去抖触发 —— 两者分离,和
 * `infinite-combobox` 的 searchValue/queryValue 拆分同一范式。
 */
export function SearchInput({
  value,
  defaultValue,
  onChange,
  onSearch,
  debounceMs = 300,
  className,
  ...rest
}: SearchInputProps) {
  const [text, setText] = useControllableState<string>({
    value,
    defaultValue,
    onChange,
    fallback: '',
  })
  // ahooks 把 run 的类型转发给 lodash 的 `DebouncedFunc`,而本仓库没装 @types/lodash,
  // run 会落成 error type(any 传染到调用处)。按 useDebounceFn 的 d.ts 收窄回真实签名:
  // run 就是「同参数的 fn,返回值可能因去抖而缺席」,这里只当副作用用,返回 void。
  const { run: commit } = useDebounceFn((raw: string) => onSearch(raw.trim() || undefined), {
    wait: debounceMs,
  }) as { run: (raw: string) => void }

  return (
    <div className={cn('relative', className)}>
      <span className='i-lucide-search pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground' />
      <Input
        className='pl-8'
        value={text}
        onChange={(event) => {
          setText(event.target.value)
          commit(event.target.value)
        }}
        {...rest}
      />
    </div>
  )
}
