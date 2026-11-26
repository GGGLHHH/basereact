import type { KeyboardEvent } from 'react'

// 整行点击绑了导航(DataTable 的 onRowAction)时,操作列按钮必须把键盘激活截住。
//
// cadenza 给带 onRowAction 的 <tr> 挂了 tabIndex=0 与一个对 Enter/Space 无条件
// preventDefault() + activate() 的 onKeyDown,而且不看 event.target。所以键盘按下
// 操作按钮时,keydown 冒泡到行上会**同时**取消按钮自身的原生激活(Enter 的默认动作
// 就是 click)并触发行导航。onClick 上的 stopPropagation 只覆盖鼠标路径,拦不住这个。
// 操作列按钮一律 onKeyDown={stopRowActivation}。
export function stopRowActivation(event: KeyboardEvent<HTMLElement>): void {
  if (event.key === 'Enter' || event.key === ' ') {
    event.stopPropagation()
  }
}
