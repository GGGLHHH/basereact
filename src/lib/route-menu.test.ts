import { describe, expect, it } from 'vitest'

import type { AnyRoute } from '@tanstack/react-router'

import { buildAdminMenu } from './route-menu'

function route(fullPath: string, staticData?: object, children?: object[]): object {
  return { children, fullPath, options: staticData ? { staticData } : {} }
}

const tree = route('/', undefined, [
  route('/', { menuTitleKey: 'home', titleKey: 'home' }),
  route('/admin', { hideInMenu: true, titleKey: 'admin' }, [
    // pathless _shell:fullPath 继承 /admin
    route('/admin', undefined, [
      route('/admin/widgets', {
        group: 'Admin',
        icon: 'i-tabler-box',
        menuTitleKey: 'adminWidgets',
        order: 2,
        titleKey: 'adminWidgets',
      }),
      route('/admin/first', { group: 'Admin', menuTitle: 'First', order: 1 }),
      route('/admin/hidden', { hideInMenu: true, menuTitle: 'Hidden' }),
      route('/admin/ungrouped', { menuTitle: 'Loose', order: 3 }),
    ]),
    route('/admin/login', { accessPublic: true, titleKey: 'adminLogin' }),
  ]),
]) as unknown as AnyRoute

describe('buildAdminMenu', () => {
  const groups = buildAdminMenu(tree)

  it('collects only /admin/* routes with explicit menu titles', () => {
    const urls = groups.flatMap((group) => group.entries.map((entry) => entry.url))
    // login(仅 titleKey)、hidden(hideInMenu)、首页(非 /admin)都不进。
    expect(urls).toEqual(['/admin/first', '/admin/widgets', '/admin/ungrouped'])
  })

  it('groups by staticData.group and sorts by order', () => {
    expect(groups.map((group) => group.label)).toEqual(['Admin', 'General'])
    expect(groups[0].entries.map((entry) => entry.url)).toEqual([
      '/admin/first',
      '/admin/widgets',
    ])
  })

  it('keeps icon and translation key on entries', () => {
    const widgets = groups[0].entries.find((entry) => entry.url === '/admin/widgets')
    expect(widgets?.icon).toBe('i-tabler-box')
    expect(widgets?.labelKey).toBe('adminWidgets')
  })
})
