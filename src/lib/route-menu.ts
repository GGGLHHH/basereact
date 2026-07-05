import type { AnyRoute, StaticDataRouteOption } from '@tanstack/react-router'

export interface AdminMenuEntry {
  icon?: string
  /** 硬编码 fallback(menuTitle ?? title),labelKey 缺席时用。 */
  label?: string
  labelKey?: StaticDataRouteOption['menuTitleKey']
  order: number
  url: string
}

export interface AdminMenuGroup {
  entries: AdminMenuEntry[]
  label: string
}

const DEFAULT_GROUP = 'General'
const DEFAULT_ORDER = Number.MAX_SAFE_INTEGER

// 入菜单的判据是"显式给了菜单标题"(menuTitleKey / menuTitle),
// 只有 titleKey 的路由(登录页、面包屑专用)不进菜单。
export function buildAdminMenu(root: AnyRoute): AdminMenuGroup[] {
  const collected: (AdminMenuEntry & { group: string })[] = []

  const visit = (route: AnyRoute) => {
    const staticData = (route.options?.staticData ?? {}) as StaticDataRouteOption
    const fullPath = String(route.fullPath ?? '').replace(/\/+$/, '')

    if (
      fullPath.startsWith('/admin/') &&
      !staticData.hideInMenu &&
      (staticData.menuTitleKey || staticData.menuTitle)
    ) {
      collected.push({
        group: staticData.group ?? DEFAULT_GROUP,
        icon: staticData.icon,
        label: staticData.menuTitle ?? staticData.title,
        labelKey: staticData.menuTitleKey,
        order: staticData.order ?? DEFAULT_ORDER,
        url: fullPath,
      })
    }

    for (const child of Object.values(route.children ?? {})) {
      visit(child as AnyRoute)
    }
  }

  visit(root)
  collected.sort((a, b) => a.order - b.order || a.url.localeCompare(b.url))

  const groups = new Map<string, AdminMenuGroup>()
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
