import { isStaticDataGranted } from '#/lib/access-control'

import type { StaticDataRouteOption } from '@tanstack/react-router'

export interface AdminMenuEntry<TPath extends string = string> {
  /** 嵌套子项(按 fullPath 前缀构建);叶子为 []。 */
  children: AdminMenuEntry<TPath>[]
  icon?: string
  /** 硬编码 fallback(menuTitle ?? title),labelKey 缺席时用。 */
  label?: string
  labelKey?: StaticDataRouteOption['menuTitleKey']
  order: number
  url: TPath
}

export interface AdminMenuGroup<TPath extends string = string> {
  entries: AdminMenuEntry<TPath>[]
  label: string
}

const DEFAULT_GROUP = 'General'
const DEFAULT_ORDER = Number.MAX_SAFE_INTEGER

// 菜单构建只需要每条路由的这两块;结构化最小类型而非 RegisteredRouter['routesById']:
// 后者是字面量 key 的 mapped type,没有索引签名,Object.values 会落到
// `(o: {}): any[]` 兜底重载,循环变量静默塌成 any。Record 有真索引签名,
// 第一重载命中;TPath 泛型让 fullPath 的路由字面量类型一路保到
// AdminMenuEntry.url,消费端 <Link to={entry.url}> 吃到完整路由联合类型。
export interface MenuSourceRoute<TPath extends string = string> {
  fullPath: TPath
  options: { staticData?: StaticDataRouteOption }
}

// 内部工作节点:多带 staticData/group 供建树、授权裁剪、分组,输出前抹掉。
interface WorkNode<TPath extends string> {
  children: WorkNode<TPath>[]
  fullPath: TPath
  group: string
  icon?: string
  label?: string
  labelKey?: StaticDataRouteOption['menuTitleKey']
  order: number
  staticData: StaticDataRouteOption
}

// 数据源用 router.routesById(拍平路由表)而非递归走 routeTree。
// 入菜单的判据是"显式给了菜单标题"(menuTitleKey / menuTitle),
// 只有 titleKey 的路由(登录页、面包屑专用、父路由的 index)不进菜单。
//
// 菜单是树:子项按 fullPath 前缀挂到最近的菜单祖先下,消费端渲染折叠子菜单。
// permissions = 有效权限集;授权裁剪按树做——未授权节点连同其整棵子树一起隐藏
// (子路由的准入被守卫链 AND,父不通子必不可达)。这与守卫(requireAdmin 按完整
// 匹配链 AND)在"菜单节点即策略声明处"时一致;仅当某条策略声明在非菜单的中间
// 路由(如 _shell)才会与守卫分歧,当前无此类路由。fail-closed:权限集未加载
// (默认 [])时,声明了准入的节点先不出现,加载后补上。
export function buildAdminMenu<TPath extends string>(
  routesById: Record<string, MenuSourceRoute<TPath>>,
  permissions: readonly string[] = [],
): AdminMenuGroup<TPath>[] {
  const nodes: WorkNode<TPath>[] = []
  for (const route of Object.values(routesById)) {
    const staticData = route.options.staticData ?? {}
    if (
      route.fullPath.startsWith('/admin/') &&
      !staticData.hideInMenu &&
      (staticData.menuTitleKey || staticData.menuTitle)
    ) {
      nodes.push({
        children: [],
        fullPath: route.fullPath,
        group: staticData.group ?? DEFAULT_GROUP,
        icon: staticData.icon,
        label: staticData.menuTitle ?? staticData.title,
        labelKey: staticData.menuTitleKey,
        order: staticData.order ?? DEFAULT_ORDER,
        staticData,
      })
    }
  }

  // 建树:父在前(fullPath 短)才能被子挂上。每个节点挂到 fullPath 前缀最长的
  // 那个菜单祖先;无祖先则为根。前缀判定带 '/' 边界,防 /admin/nested 误吞
  // /admin/nested2。
  const byDepth = [...nodes].sort((a, b) => a.fullPath.length - b.fullPath.length)
  const roots: WorkNode<TPath>[] = []
  for (const node of byDepth) {
    let parent: WorkNode<TPath> | undefined
    for (const candidate of byDepth) {
      if (
        candidate !== node &&
        node.fullPath.startsWith(`${candidate.fullPath}/`) &&
        (!parent || candidate.fullPath.length > parent.fullPath.length)
      ) {
        parent = candidate
      }
    }
    if (parent) {
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  }

  // 授权裁剪 + 同级排序 + 抹掉内部字段,自顶向下递归(未授权即断子树)。
  const prune = (list: WorkNode<TPath>[]): AdminMenuEntry<TPath>[] =>
    list
      .filter((node) => isStaticDataGranted(node.staticData, permissions))
      .sort((a, b) => a.order - b.order || a.fullPath.localeCompare(b.fullPath))
      .map((node) => ({
        children: prune(node.children),
        icon: node.icon,
        label: node.label,
        labelKey: node.labelKey,
        order: node.order,
        url: node.fullPath,
      }))

  // 组顺序 = 各组首个根(按 order)出现的顺序,与老行为一致。
  const groups = new Map<string, WorkNode<TPath>[]>()
  for (const root of roots.sort(
    (a, b) => a.order - b.order || a.fullPath.localeCompare(b.fullPath),
  )) {
    const existing = groups.get(root.group)
    if (existing) {
      existing.push(root)
    } else {
      groups.set(root.group, [root])
    }
  }

  const result: AdminMenuGroup<TPath>[] = []
  for (const [label, rootList] of groups) {
    const entries = prune(rootList)
    if (entries.length > 0) {
      result.push({ entries, label })
    }
  }
  return result
}
