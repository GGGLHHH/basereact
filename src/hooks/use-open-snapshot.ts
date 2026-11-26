import { useState } from 'react'

/**
 * 弹窗打开那一刻的目标快照。
 *
 * 调用方通常在关闭时把目标清成 null(或操作成功后目标本身变了,如停用后状态翻成 suspended),
 * 而弹窗的关闭动画还要再渲染几帧 —— 直接读 props 会在动画期间文案跳变(名字变空、「停用」
 * 变「恢复」)。这里只在 open 由关变开时取一次值,开着期间和关闭动画期间都用这份快照。
 */
export function useOpenSnapshot<T>(open: boolean, value: T): T {
  const [snapshot, setSnapshot] = useState(value)
  const [wasOpen, setWasOpen] = useState(open)
  const opening = open && !wasOpen
  if (open !== wasOpen) {
    // 渲染期按「上一次的 props」调整 state(React 文档的 storing information from previous renders 写法)。
    setWasOpen(open)
    if (opening) {
      setSnapshot(value)
    }
  }
  return opening ? value : snapshot
}
