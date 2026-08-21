// 从 moving-highlight.tsx 拆出来:它是纯函数,和那边的组件同住会拦住 Fast Refresh
// (react-refresh/only-export-components)。没有任何 React 依赖,所以是 .ts 不是 .tsx。

// 可 hover 项的标记属性;激活项额外带 active。enabled=false 时不挂(高亮整体关掉的场景,
// 如侧栏收起态)。spread 到项元素上即可。
export function movingHighlightItemProps(
  active: boolean,
  enabled = true,
): { 'data-mh-item'?: string, 'data-mh-active'?: string } {
  return {
    'data-mh-item': enabled ? '' : undefined,
    'data-mh-active': enabled && active ? 'true' : undefined,
  }
}
