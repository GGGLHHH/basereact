import { QueryClient } from '@tanstack/react-query'
import { createMemoryHistory, createRouter } from '@tanstack/react-router'
import { describe, expect, it } from 'vitest'

import { routeTree } from '../routeTree.gen'
import { buildAdminMenu } from './route-menu'

import type { StaticDataRouteOption } from '@tanstack/react-router'
import type { MenuSourceRoute } from './route-menu'

// 假体是纯对象字面量,直接满足 Record<string, MenuSourceRoute>,零 cast;
// staticData 参数强类型,fixture 里写错 key 编译期报。
function route<TPath extends string>(
  fullPath: TPath,
  staticData?: StaticDataRouteOption,
): MenuSourceRoute<TPath> {
  return { fullPath, options: staticData ? { staticData } : {} }
}

const routesById = {
  __root__: route(''),
  '/': route('/', { menuTitleKey: 'home', titleKey: 'home' }),
  '/admin': route('/admin', { hideInMenu: true, titleKey: 'admin' }),
  '/admin/_shell': route('/admin'),
  '/admin/_shell/widgets': route('/admin/widgets', {
    group: 'Admin',
    icon: 'i-tabler-box',
    menuTitleKey: 'adminWidgets',
    order: 2,
    titleKey: 'adminWidgets',
  }),
  '/admin/_shell/first': route('/admin/first', { group: 'Admin', menuTitle: 'First', order: 1 }),
  '/admin/_shell/hidden': route('/admin/hidden', { hideInMenu: true, menuTitle: 'Hidden' }),
  '/admin/_shell/ungrouped': route('/admin/ungrouped', { menuTitle: 'Loose', order: 3 }),
  '/admin/login': route('/admin/login', { accessPublic: true, titleKey: 'adminLogin' }),
}

// 真实 routeTree 集成:抓"约定漂移"类回归——新路由的 staticData 写错/漏写、
// 登录页/错误页意外混进菜单,只有真树能暴露。
describe('buildAdminMenu with the real route tree', () => {
  const router = createRouter({
    context: { queryClient: new QueryClient() },
    history: createMemoryHistory(),
    routeTree,
  })
  const groups = buildAdminMenu({ ...router.routesById })
  const urls = groups.flatMap((group) => group.entries.map((entry) => entry.url))

  it('exposes exactly the admin pages that declare menu titles', () => {
    expect(urls).toEqual(['/admin/home', '/admin/widgets'])
  })

  it('keeps login and error pages out of the menu', () => {
    expect(urls).not.toContain('/admin/login')
    expect(urls.some((url) => url.includes('403') || url.includes('404'))).toBe(false)
  })

  it('puts both pages in the Admin group with home first', () => {
    expect(groups).toHaveLength(1)
    expect(groups[0].label).toBe('Admin')
    expect(groups[0].entries[0]).toMatchObject({
      icon: 'i-tabler-home',
      labelKey: 'adminHome',
      url: '/admin/home',
    })
  })
})

describe('buildAdminMenu', () => {
  const groups = buildAdminMenu(routesById)

  it('collects only /admin/* routes with explicit menu titles', () => {
    const urls = groups.flatMap((group) => group.entries.map((entry) => entry.url))
    // login(仅 titleKey)、hidden(hideInMenu)、首页(非 /admin)都不进。
    expect(urls).toEqual(['/admin/first', '/admin/widgets', '/admin/ungrouped'])
  })

  it('groups by staticData.group and sorts by order', () => {
    expect(groups.map((group) => group.label)).toEqual(['Admin', 'General'])
    expect(groups[0].entries.map((entry) => entry.url)).toEqual(['/admin/first', '/admin/widgets'])
  })

  it('keeps icon and translation key on entries', () => {
    const widgets = groups[0].entries.find((entry) => entry.url === '/admin/widgets')
    expect(widgets?.icon).toBe('i-tabler-box')
    expect(widgets?.labelKey).toBe('adminWidgets')
  })
})
