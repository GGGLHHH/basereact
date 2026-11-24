import type { StaticDataRouteOption } from '@tanstack/react-router'
import type { AdminMenuEntry, MenuSourceRoute } from './route-menu'
import { BlocksIcon, HouseIcon } from '@gedatou/cadenza-icons'
import { QueryClient } from '@tanstack/react-query'

import { createMemoryHistory, createRouter, isRedirect } from '@tanstack/react-router'
import { describe, expect, it } from 'vitest'

import { routeTree } from '../routeTree.gen'
import { buildAdminMenu, findMenuEntry, pickActiveMenuUrl } from './route-menu'

// 假体是纯对象字面量,直接满足 Record<string, MenuSourceRoute>,零 cast;
// staticData 参数强类型,fixture 里写错 key 编译期报。
function route<TPath extends string>(
  fullPath: TPath,
  staticData?: StaticDataRouteOption,
): MenuSourceRoute<TPath> {
  return { fullPath, options: staticData ? { staticData } : {} }
}

// 树深度优先摊平成 url 列表,供整链断言。
function collectUrls<TPath extends string>(entries: AdminMenuEntry<TPath>[]): TPath[] {
  return entries.flatMap(entry => [entry.url, ...collectUrls(entry.children)])
}

const routesById = {
  '__root__': route(''),
  '/': route('/', { menuTitleKey: 'titles.home', titleKey: 'titles.home' }),
  '/admin': route('/admin', { hideInMenu: true, titleKey: 'titles.admin' }),
  '/admin/_shell': route('/admin'),
  '/admin/_shell/widgets': route('/admin/widgets', {
    groupKey: 'menuGroups.admin',
    icon: BlocksIcon,
    menuTitleKey: 'titles.adminWidgets',
    order: 2,
    titleKey: 'titles.adminWidgets',
  }),
  '/admin/_shell/first': route('/admin/first', {
    groupKey: 'menuGroups.admin',
    menuTitle: 'First',
    order: 1,
  }),
  '/admin/_shell/hidden': route('/admin/hidden', { hideInMenu: true, menuTitle: 'Hidden' }),
  '/admin/_shell/ungrouped': route('/admin/ungrouped', { menuTitle: 'Loose', order: 3 }),
  '/admin/login': route('/admin/login', { accessPublic: true, titleKey: 'titles.adminLogin' }),
}

// 真实 routeTree 集成:抓"约定漂移"类回归——新路由的 staticData 写错/漏写、
// 登录页/错误页意外混进菜单、嵌套层级构建错位,只有真树能暴露。
describe('buildAdminMenu with the real route tree', () => {
  const router = createRouter({
    context: { queryClient: new QueryClient() },
    history: createMemoryHistory(),
    routeTree,
  })
  // widgets 声明了 accessPolicyKeys: ['adminListWidgets'](AND: users:admin + admin:login),
  // 完整菜单断言要携带这两个权限;nested/* 无策略声明,恒可见。
  const groups = buildAdminMenu({ ...router.routesById }, ['users:admin', 'admin:login'])

  it('exposes the full nested tree of admin pages that declare menu titles', () => {
    expect(collectUrls(groups.flatMap(group => group.entries))).toEqual([
      '/admin/home',
      '/admin/auth-log',
      '/admin/monitoring',
      '/admin/users',
      '/admin/widgets',
      '/admin/nested',
      '/admin/nested/overview',
      '/admin/nested/reports',
      '/admin/nested/reports/daily',
      '/admin/nested/reports/regions',
    ])
  })

  it('nests children under parents by fullPath prefix', () => {
    const nested = groups
      .flatMap(group => group.entries)
      .find(entry => entry.url === '/admin/nested')
    expect(nested?.children.map(child => child.url)).toEqual([
      '/admin/nested/overview',
      '/admin/nested/reports',
    ])
    const reports = nested?.children.find(child => child.url === '/admin/nested/reports')
    expect(reports?.children.map(child => child.url)).toEqual([
      '/admin/nested/reports/daily',
      '/admin/nested/reports/regions',
    ])
  })

  it('hides policy-declaring entries until permissions are known (fail closed)', () => {
    const trimmed = buildAdminMenu({ ...router.routesById })
    // widgets / monitoring(声明 users:admin)缺席;nested 子树无策略,照常出现。
    expect(collectUrls(trimmed.flatMap(group => group.entries))).not.toContain('/admin/widgets')
    expect(collectUrls(trimmed.flatMap(group => group.entries))).not.toContain('/admin/monitoring')
    expect(collectUrls(trimmed.flatMap(group => group.entries))).toContain('/admin/nested')
  })

  it('keeps login and error pages out of the menu', () => {
    const urls = collectUrls(groups.flatMap(group => group.entries))
    expect(urls).not.toContain('/admin/login')
    expect(urls.some(url => url.includes('403') || url.includes('404'))).toBe(false)
  })

  it('groups top-level pages, Admin (home first) before Demo', () => {
    expect(groups.map(group => group.labelKey)).toEqual(['menuGroups.admin', 'menuGroups.demo'])
    expect(groups[0].entries[0]).toMatchObject({
      icon: HouseIcon,
      labelKey: 'titles.adminHome',
      url: '/admin/home',
    })
  })
  // 纯分组 = 菜单里有子项的节点:路由声明 isGroup,index 重定向到菜单里的第一个子页,
  // 面包屑这一级显示为纯文字。三处各写各的,这条把它们对齐:漏标、多标、改了子页
  // 顺序忘了改重定向目标,都在这里报。
  it('declares menu nodes with children as groups that redirect to their first child', () => {
    const flatten = (entries: AdminMenuEntry[]): AdminMenuEntry[] =>
      entries.flatMap(entry => [entry, ...flatten(entry.children)])
    const parents = flatten(groups.flatMap(group => group.entries)).filter(entry => entry.children.length > 0)
    // 结构化最小类型(同 route-menu.ts 的 MenuSourceRoute):直接 Object.values(routesById)
    // 会塌成 any。beforeLoad 收 never:只调它看抛不抛 redirect,不关心参数。
    const byId: Record<string, {
      fullPath: string
      options: { beforeLoad?: (context: never) => unknown, staticData?: StaticDataRouteOption }
    }> = { ...router.routesById }
    const routes = Object.values(byId)
    const declared = routes.filter(route => route.options.staticData?.isGroup === true).map(route => route.fullPath)
    expect([...declared].sort()).toEqual(parents.map(entry => entry.url).sort())

    for (const parent of parents) {
      const index = routes.find(route => route.fullPath === `${parent.url}/`)
      let thrown: unknown
      try {
        index?.options.beforeLoad?.({} as never)
      }
      catch (error) {
        thrown = error
      }
      expect(isRedirect(thrown) ? thrown.options.to : undefined).toBe(parent.children[0]?.url)
    }
  })

  it('finds a menu entry with its subtree by url', () => {
    expect(findMenuEntry(groups, '/admin/nested/reports')?.children.map(child => child.url)).toEqual([
      '/admin/nested/reports/daily',
      '/admin/nested/reports/regions',
    ])
    expect(findMenuEntry(groups, '/admin/login')).toBeUndefined()
  })
})

describe('buildAdminMenu', () => {
  const groups = buildAdminMenu(routesById)

  it('collects only /admin/* routes with explicit menu titles', () => {
    // 这些 fixture 都是单段叶子,互不为前缀,全为顶层。
    const urls = groups.flatMap(group => group.entries.map(entry => entry.url))
    // login(仅 titleKey)、hidden(hideInMenu)、首页(非 /admin)都不进。
    expect(urls).toEqual(['/admin/first', '/admin/widgets', '/admin/ungrouped'])
  })

  it('groups by staticData.group and sorts by order', () => {
    expect(groups.map(group => group.labelKey)).toEqual([
      'menuGroups.admin',
      'menuGroups.general',
    ])
    expect(groups[0].entries.map(entry => entry.url)).toEqual(['/admin/first', '/admin/widgets'])
  })

  it('keeps icon and translation key on entries', () => {
    const widgets = groups[0].entries.find(entry => entry.url === '/admin/widgets')
    expect(widgets?.icon).toBe(BlocksIcon)
    expect(widgets?.labelKey).toBe('titles.adminWidgets')
  })
})

describe('pickActiveMenuUrl', () => {
  // 顶层叶子 /admin/users(详情/建号不入菜单)+ 嵌套 section /admin/nested/*。
  const groups = buildAdminMenu(
    {
      '/admin/_shell/users': route('/admin/users', { menuTitle: 'Users' }),
      '/admin/_shell/users-archive': route('/admin/users-archive', { menuTitle: 'Archive' }),
      '/admin/_shell/nested': route('/admin/nested', { menuTitle: 'Nested' }),
      '/admin/_shell/nested/overview': route('/admin/nested/overview', { menuTitle: 'Overview' }),
    },
    [],
  )

  it('falls back to the nearest menu ancestor when the page is not itself a menu item', () => {
    // 详情页不入菜单 → 激活态留在父路由 users。
    expect(pickActiveMenuUrl(groups, '/admin/users/123')).toBe('/admin/users')
    expect(pickActiveMenuUrl(groups, '/admin/users/123/edit')).toBe('/admin/users')
  })

  it('picks the exact item when the page is itself a menu item', () => {
    expect(pickActiveMenuUrl(groups, '/admin/users')).toBe('/admin/users')
  })

  it('picks the deepest matching item, not an ancestor also in the menu', () => {
    // overview 与父 nested 都是前缀 → 取最深的 overview。
    expect(pickActiveMenuUrl(groups, '/admin/nested/overview')).toBe('/admin/nested/overview')
    expect(pickActiveMenuUrl(groups, '/admin/nested')).toBe('/admin/nested')
  })

  it('respects the / boundary so a prefix sibling never matches', () => {
    // users-archive 不能被 users 吞;archive 详情回落到 archive 自身。
    expect(pickActiveMenuUrl(groups, '/admin/users-archive/9')).toBe('/admin/users-archive')
  })

  it('returns undefined when no menu item covers the path', () => {
    expect(pickActiveMenuUrl(groups, '/admin/widgets/1')).toBeUndefined()
  })
})

describe('buildAdminMenu nesting', () => {
  // 前缀建树:child 挂到最近祖先;深链两级验证。
  const tree = {
    '/admin/_shell/section': route('/admin/section', { menuTitle: 'Section', order: 0 }),
    '/admin/_shell/section/child': route('/admin/section/child', { menuTitle: 'Child', order: 1 }),
    '/admin/_shell/section/child/leaf': route('/admin/section/child/leaf', { menuTitle: 'Leaf' }),
    // 与 section 同段前缀但不同路由,不能被误吞为其子。
    '/admin/_shell/section-two': route('/admin/section-two', { menuTitle: 'Section Two' }),
  }
  const groups = buildAdminMenu(tree)

  it('attaches each route to its nearest menu ancestor, / boundary aware', () => {
    const roots = groups.flatMap(group => group.entries)
    expect(roots.map(entry => entry.url)).toEqual(['/admin/section', '/admin/section-two'])
    const section = roots.find(entry => entry.url === '/admin/section')
    expect(section?.children.map(child => child.url)).toEqual(['/admin/section/child'])
    expect(section?.children[0].children.map(child => child.url)).toEqual([
      '/admin/section/child/leaf',
    ])
  })
})
