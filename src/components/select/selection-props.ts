import type { ControllableSelectionProps } from '@gedatou/cadenza-ui'

/**
 * 把选择相关的 props 从业务包装器透传给 `InfiniteCombobox`。
 *
 * 存在的唯一理由是 TypeScript:`ControllableSelectionProps` 是以 `selectionMode`
 * 为判别键的联合,直接 `{...props}` 展开会把判别键的关联信息丢掉,单选分支就可能
 * 收到 `string[]`。这里按分支显式重建,判别关系才留得住。
 *
 * `value`/`defaultValue` 只在确实存在时挂键:受控性由「键在不在」决定,把 undefined
 * 也塞进去会被判成「受控但值为 undefined」。
 */
export function getInfiniteComboboxSelectionProps<T>(
  props: ControllableSelectionProps<T>,
): ControllableSelectionProps<T> {
  if (props.selectionMode === 'multiple') {
    return {
      ...(props.value !== undefined ? { value: props.value } : {}),
      ...(props.defaultValue !== undefined ? { defaultValue: props.defaultValue } : {}),
      selectionMode: 'multiple',
      onValueChange: props.onValueChange,
    }
  }

  return {
    ...(props.value !== undefined ? { value: props.value } : {}),
    ...(props.defaultValue !== undefined ? { defaultValue: props.defaultValue } : {}),
    onValueChange: props.onValueChange,
  }
}
