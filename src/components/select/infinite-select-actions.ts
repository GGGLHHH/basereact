import { createContext, use } from 'react'

/** footer 内可消费的选择器动作。上层(combobox)提供实现:clear=清选择、close=关弹层(含 commitOnClose 提交)。 */
export interface InfiniteSelectActions<T = unknown> {
  /** 已选项(仅已加载页的回显)。 */
  selectedItems: T[]
  /** 已选 id(权威全集,含未加载页)。 */
  selectedIds: string[]
  clear: () => void
  close: () => void
}

// Context 定义在**底座层**,由上层 InfiniteCombobox 填值。放低层是刻意的:
// infinite-combobox 已依赖 infinite-select,hook/部件住这里才不会反向 import 成环。
export const InfiniteSelectActionsContext = createContext<InfiniteSelectActions | null>(null)

/** 在 `InfiniteSelect` 的 `footer` 内取 clear/close/当前选择。用在 footer 之外会抛错(fail-fast)。 */
export function useInfiniteSelectActions<T = unknown>(): InfiniteSelectActions<T> {
  const ctx = use(InfiniteSelectActionsContext)
  if (!ctx) {
    throw new Error('useInfiniteSelectActions 必须用在 InfiniteSelect 的 footer 内')
  }
  return ctx as InfiniteSelectActions<T>
}
