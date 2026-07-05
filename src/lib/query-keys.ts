export const queryKeys = {
  // admin 与 frontend 两个 surface 的会话缓存隔离,互不失效。
  admin: {
    auth: {
      all: ['admin', 'auth'] as const,
      me: () => [...queryKeys.admin.auth.all, 'me'] as const,
      // 有效权限集(getMyPermissions)。挂在 admin.auth 前缀下:
      // 登录 removeQueries(all) / 登出 clear() 自动连带失效,无独立生命周期。
      permissions: () => [...queryKeys.admin.auth.all, 'permissions'] as const,
    },
  },
  auth: {
    all: ['auth'] as const,
    me: () => [...queryKeys.auth.all, 'me'] as const,
  },
  contents: {
    all: ['contents'] as const,
    list: () => [...queryKeys.contents.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.contents.all, 'detail', id] as const,
    metadata: (id: string) => [...queryKeys.contents.detail(id), 'metadata'] as const,
    objects: (id: string) => [...queryKeys.contents.detail(id), 'objects'] as const,
  },
  widgets: {
    all: ['widgets'] as const,
    list: (request?: unknown) => [...queryKeys.widgets.all, 'list', request ?? {}] as const,
    adminList: (request?: unknown) =>
      [...queryKeys.widgets.all, 'admin-list', request ?? {}] as const,
    detail: (id: string) => [...queryKeys.widgets.all, 'detail', id] as const,
    stats: () => [...queryKeys.widgets.all, 'stats'] as const,
    myCount: () => [...queryKeys.widgets.all, 'my-count'] as const,
  },
}
