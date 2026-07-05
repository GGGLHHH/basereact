import type { StaticDataRouteOption } from '@tanstack/react-router'

export interface AdminMenuEntry<TPath extends string = string> {
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

// 数据源用 router.routesById(拍平路由表)而非递归走 routeTree。
// 入菜单的判据是"显式给了菜单标题"(menuTitleKey / menuTitle),
// 只有 titleKey 的路由(登录页、面包屑专用)不进菜单。
export function buildAdminMenu<TPath extends string>(
  routesById: Record<string, MenuSourceRoute<TPath>>,
): AdminMenuGroup<TPath>[] {
  const collected: (AdminMenuEntry<TPath> & { group: string })[] = []

  for (const route of Object.values(routesById)) {
    const staticData = route.options.staticData ?? {}

    if (
      route.fullPath.startsWith('/admin/') &&
      !staticData.hideInMenu &&
      (staticData.menuTitleKey || staticData.menuTitle)
    ) {
      collected.push({
        group: staticData.group ?? DEFAULT_GROUP,
        icon: staticData.icon,
        label: staticData.menuTitle ?? staticData.title,
        labelKey: staticData.menuTitleKey,
        order: staticData.order ?? DEFAULT_ORDER,
        url: route.fullPath,
      })
    }
  }

  collected.sort((a, b) => a.order - b.order || a.url.localeCompare(b.url))

  const groups = new Map<string, AdminMenuGroup<TPath>>()
  for (const { group, ...entry } of collected) {
    const existing = groups.get(group)
    if (existing) {
      existing.entries.push(entry)
    } else {
      groups.set(group, { entries: [entry], label: group })
    }
  }

  // collected 已按 order 排好,组顺序 = 各组首个条目的 order 顺序。
  return [...groups.values()]
}
