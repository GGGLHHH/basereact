export const queryKeys = {
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
