export const queryKeys = {
  // admin 与 frontend 两个 surface 的会话缓存隔离,互不失效。
  admin: {
    auth: {
      all: ['admin', 'auth'] as const,
      me: () => [...queryKeys.admin.auth.all, 'me'] as const,
      // 有效权限集(getMyPermissions)。挂在 admin.auth 前缀下:
      // 登录 / 登出都 clear() 全部缓存,自动连带失效,无独立生命周期。
      permissions: () => [...queryKeys.admin.auth.all, 'permissions'] as const,
    },
  },
  auth: {
    all: ['auth'] as const,
    me: () => [...queryKeys.auth.all, 'me'] as const,
    // 我的租户列表(GET /frontend/auth/tenants)。登录 / 登出 / 切换租户时整体清掉。
    tenants: () => [...queryKeys.auth.all, 'tenants'] as const,
  },
  profile: {
    all: ['profile'] as const,
    me: () => [...queryKeys.profile.all, 'me'] as const,
    // 管理员按 user_id 查/改他人资料(GET/PUT /admin/auth/users/{id}/profile);与 me() 分开缓存。
    detail: (userId: string) => [...queryKeys.profile.all, 'detail', userId] as const,
  },
  contents: {
    all: ['contents'] as const,
  },
  widgets: {
    all: ['widgets'] as const,
    list: (request?: unknown) => [...queryKeys.widgets.all, 'list', request ?? {}] as const,
  },
  // 本租户成员(GET /admin/auth/members,租户级)。切换租户时随全部查询一起 resetQueries(见 lib/session-sync.ts)。
  members: {
    all: ['members'] as const,
    list: (request?: unknown) => [...queryKeys.members.all, 'list', request ?? {}] as const,
  },
  // 平台租户管理(/admin/platform/tenants*,平台级)。某租户的成员单独一支,不挂在 detail 下:
  // 改名 / 停用只动 detail 与列表,不连带重取成员表。
  tenants: {
    all: ['tenants'] as const,
    list: (request?: unknown) => [...queryKeys.tenants.all, 'list', request ?? {}] as const,
    detail: (id: string) => [...queryKeys.tenants.all, 'detail', id] as const,
    members: (id: string) => [...queryKeys.tenants.all, 'members', id] as const,
    memberList: (id: string, request?: unknown) =>
      [...queryKeys.tenants.members(id), request ?? {}] as const,
  },
  roles: {
    all: ['roles'] as const,
    list: () => [...queryKeys.roles.all, 'list'] as const,
    optionsInfiniteList: () => [...queryKeys.roles.all, 'options-infinite'] as const,
  },
  users: {
    all: ['users'] as const,
    list: (request?: unknown) => [...queryKeys.users.all, 'list', request ?? {}] as const,
    detail: (id: string) => [...queryKeys.users.all, 'detail', id] as const,
    optionsInfiniteList: (request?: unknown) =>
      [...queryKeys.users.all, 'options-infinite', request ?? {}] as const,
  },
}
