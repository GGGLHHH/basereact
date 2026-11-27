// @vitest-environment happy-dom

import type { MemberView, MyPermissionsResponse, MyTenantView, UserResponse } from '@/generated/api-types'
import { keepPreviousData, QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { createMemoryHistory, createRootRouteWithContext, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { globalRouter } from '@/lib/global-router'
import { requireAdmin } from '@/lib/route-guard'
import { SESSION_CHANNEL, SessionSync } from '@/lib/session-sync'

import { AdminShell } from '../-shell-layout'
import { MembersPage } from './-members-page'

// 渲染层回归(复审 #1 / #2):真实的后台壳 + 成员页 + 切换器 + 守卫 + api-client,只把 fetch 换成
// 内存里的假后端。断言的是用户看得见的东西:切换 / 别的标签页换了会话之后,页面重新取数,
// 显示新组织的行,上一个组织的行(包括还开着的、指向旧行的写操作弹窗)一条不留。

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

type OrgId = 'org-a' | 'org-b'

const ORGS: Record<OrgId, string> = { 'org-a': 'Org A', 'org-b': 'Org B' }

function member(id: string, username: string, displayName: string): MemberView {
  return { avatar_url: null, display_name: displayName, email: null, holds_platform_role: false, id, roles: ['user'], status: 'active', username }
}

const ROWS: Record<OrgId, MemberView[]> = {
  'org-a': [member('u-ada', 'ada', 'Ada of A')],
  'org-b': [member('u-bob', 'bob', 'Bob of B')],
}

// 一个不订阅任何路由状态的普通页面(只有 useQuery + keepPreviousData):router.invalidate()
// 不会让它重新渲染,它能不能换成新组织的数据只取决于缓存怎么清、壳怎么挂。
function PlainWidgetsPage() {
  const { data } = useQuery({
    placeholderData: keepPreviousData,
    queryFn: async () => (await fetch('/api/v1/admin/widgets')).json() as Promise<{ names: string[] }>,
    queryKey: ['widgets', 'plain'],
  })
  return <div>{data ? data.names.join(', ') : 'widgets loading'}</div>
}

const WIDGETS: Record<OrgId, string[]> = { 'org-a': ['widget-of-A'], 'org-b': ['widget-of-B'] }

const ME: UserResponse = { email: 'me@example.com', email_verified: true, id: 'me', roles: [], username: 'myself' }
const OTHER_ACCOUNT: UserResponse = { email: 'other@example.com', email_verified: true, id: 'other', roles: [], username: 'someone-else' }

// 假后端:当前组织放在「共享 cookie」(server.tenant)里,哪个标签页切换都改它。
const server = {
  /** 非空时除切换本身以外的请求都挂起到它 resolve,用来观察「新数据回来之前」页面上显示什么。 */
  gate: null as Promise<void> | null,
  /** 共享 cookie 里登录着的账号:别的标签页换账号登录就改它。 */
  me: ME,
  /** false = 会话已在别处结束:之后的请求一律 401,并记下来(登出之后不该再发请求)。 */
  loggedIn: true,
  requestsWhileLoggedOut: [] as string[],
  memberFetches: [] as OrgId[],
  /** 被 gate 挂起、还没回的请求数。 */
  parked: 0,
  tenant: 'org-a' as OrgId,
}

/** 之后的请求(切换本身除外)一律挂起,直到调用返回的 release。 */
function holdResponses(): () => void {
  let release!: () => void
  server.gate = new Promise<void>((resolve) => {
    release = resolve
  })
  return () => {
    server.gate = null
    release()
  }
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' }, status })
}

async function fakeBackend(input: RequestInfo | URL): Promise<Response> {
  const request = input instanceof Request ? input : new Request(String(input))
  const path = new URL(request.url).pathname.replace('/api/v1/', '')
  if (!server.loggedIn) {
    server.requestsWhileLoggedOut.push(path)
    return json(401, { code: 'unauthorized', error: 'not signed in' })
  }
  if (path === 'frontend/auth/switch-tenant' && request.method === 'POST') {
    server.tenant = ((await request.json()) as { tenant_id: OrgId }).tenant_id
    return json(200, ME)
  }
  const gate = server.gate
  if (gate) {
    server.parked += 1
    await gate
    server.parked -= 1
  }
  if (path === 'admin/auth/me') {
    return json(200, server.me)
  }
  if (path === 'frontend/permissions/me') {
    const body: MyPermissionsResponse = {
      permissions: ['admin:login', 'members:admin', 'members:read'],
      roles: [],
      tenant: { id: server.tenant, name: ORGS[server.tenant], slug: server.tenant },
      tenant_roles: ['admin'],
    }
    return json(200, body)
  }
  if (path === 'frontend/auth/tenants') {
    const body: MyTenantView[] = (Object.keys(ORGS) as OrgId[]).map(id => ({
      current: id === server.tenant,
      id,
      name: ORGS[id],
      roles: ['admin'],
      slug: id,
    }))
    return json(200, body)
  }
  if (path === 'admin/auth/members' && request.method === 'GET') {
    const tenant = server.tenant
    server.memberFetches.push(tenant)
    const items = ROWS[tenant]
    return json(200, { items, page_info: { mode: 'offset', page: 1, size: 20, total: items.length } })
  }
  if (path === 'admin/widgets') {
    return json(200, { names: WIDGETS[server.tenant] })
  }
  return json(404, { code: 'not_found', error: 'not found' })
}

// Node 的 Request 不接受相对 URL(浏览器按页面 origin 解析),同 api-client.test。
const OriginalRequest = globalThis.Request
class BaseUrlRequest extends OriginalRequest {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    super(typeof input === 'string' && input.startsWith('/') ? `http://localhost${input}` : input, init)
  }
}

function renderAdmin(initialPath = '/admin/members') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { refetchOnWindowFocus: false, retry: false, staleTime: 5 * 60 * 1000 } },
  })
  const rootRoute = createRootRouteWithContext<{ queryClient: QueryClient }>()({
    component: () => (
      <>
        <SessionSync />
        <Outlet />
      </>
    ),
  })
  const adminRoute = createRoute({ getParentRoute: () => rootRoute, path: 'admin' })
  const loginRoute = createRoute({
    component: () => <div>admin login page</div>,
    getParentRoute: () => adminRoute,
    path: 'login',
  })
  const shellRoute = createRoute({
    beforeLoad: ({ context, location }) => requireAdmin(context.queryClient, location),
    component: AdminShell,
    getParentRoute: () => adminRoute,
    id: '_shell',
  })
  const membersRoute = createRoute({
    component: MembersPage,
    getParentRoute: () => shellRoute,
    path: 'members',
    staticData: { accessPolicyKeys: ['listMembers'], titleKey: 'titles.adminMembers' },
    validateSearch: () => ({ page: 1, size: 20 }),
  })
  const widgetsRoute = createRoute({
    component: PlainWidgetsPage,
    getParentRoute: () => shellRoute,
    path: 'widgets',
  })
  const router = createRouter({
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [initialPath] }),
    routeTree: rootRoute.addChildren([adminRoute.addChildren([loginRoute, shellRoute.addChildren([membersRoute, widgetsRoute])])]),
  })
  globalRouter.instance = router as unknown as typeof globalRouter.instance
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { queryClient, router }
}

const opened: BroadcastChannel[] = []

beforeEach(() => {
  server.memberFetches = []
  server.gate = null
  server.me = ME
  server.loggedIn = true
  server.requestsWhileLoggedOut = []
  server.parked = 0
  server.tenant = 'org-a'
  vi.stubGlobal('Request', BaseUrlRequest)
  vi.stubGlobal('fetch', vi.fn(fakeBackend))
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  })
  if (typeof (Element.prototype as { hasPointerCapture?: unknown }).hasPointerCapture !== 'function') {
    Element.prototype.hasPointerCapture = vi.fn<() => boolean>(() => false)
    Element.prototype.releasePointerCapture = vi.fn<() => void>()
    Element.prototype.setPointerCapture = vi.fn<() => void>()
  }
  Element.prototype.scrollIntoView = vi.fn<() => void>()
})

afterEach(() => {
  cleanup()
  for (const channel of opened.splice(0)) {
    channel.close()
  }
  globalRouter.instance = null
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

async function switchTo(name: RegExp) {
  fireEvent.click(document.querySelector<HTMLElement>('[data-tenant-switcher]') as HTMLElement)
  fireEvent.click(await screen.findByRole('menuitemradio', { name }))
}

/** 另一个标签页发来的「会话已变更」广播。 */
function postFromOtherTab(reason: 'login' | 'logout' | 'tenant-switched') {
  const channel = new BroadcastChannel(SESSION_CHANNEL)
  opened.push(channel)
  channel.postMessage({ reason, senderId: 'other-tab', type: 'session-changed' })
}

async function openRemoveDialogFor(name: string) {
  const row = [...document.querySelectorAll('tr')].find(tr => tr.textContent.includes(name))
  fireEvent.click(row?.querySelector('[aria-label="Remove"]') as HTMLElement)
  expect(await screen.findByText('Remove member?')).toBeTruthy()
}

describe('switching the organization in this tab', () => {
  it('refetches the members page and never shows the previous organization rows', async () => {
    renderAdmin()
    expect(await screen.findByText('Ada of A')).toBeTruthy()
    expect(server.memberFetches).toEqual(['org-a'])

    // 切换之后的请求先挂起:观察「cookie 已经换成新组织、新数据还没回来」这段时间页面上显示什么。
    const release = holdResponses()
    await switchTo(/Org B/)
    await waitFor(() => expect(server.tenant).toBe('org-b'))
    await waitFor(() => expect(server.parked).toBeGreaterThan(0))

    // 旧组织的行已经不在页面上(既不留着旧数据,也不拿它当占位)。
    expect(screen.queryByText('Ada of A')).toBeNull()

    release()
    // 以新组织身份重新请求了成员列表,显示的是新组织的行。
    expect(await screen.findByText('Bob of B')).toBeTruthy()
    expect(server.memberFetches).toEqual(['org-a', 'org-b'])
    expect(screen.queryByText('Ada of A')).toBeNull()
  })

  it('drops a write dialog that is still bound to a row of the previous organization', async () => {
    renderAdmin()
    expect(await screen.findByText('Ada of A')).toBeTruthy()
    // 「移除 Ada」的确认框开着时切换组织:确认框必须随旧页面一起消失 —— 留着的话,
    // 点确认就会以新组织的身份去移除旧组织那一行的 user id。
    await openRemoveDialogFor('Ada of A')

    await switchTo(/Org B/)

    expect(await screen.findByText('Bob of B')).toBeTruthy()
    await waitFor(() => expect(screen.queryByText('Remove member?')).toBeNull())
    expect(screen.queryByText('Ada of A')).toBeNull()
  })

  it('refetches a page that does not subscribe to router state', async () => {
    renderAdmin('/admin/widgets')
    expect(await screen.findByText('widget-of-A')).toBeTruthy()

    await switchTo(/Org B/)

    expect(await screen.findByText('widget-of-B')).toBeTruthy()
    expect(screen.queryByText('widget-of-A')).toBeNull()
  })
})

describe('session changed in another tab', () => {
  it('tenant switch elsewhere: refetches, shows the new organization and drops dialogs bound to old rows', async () => {
    renderAdmin()
    expect(await screen.findByText('Ada of A')).toBeTruthy()
    // 正开着「移除 Ada」的确认框:切换之后它不能还在 —— 否则确认会以新组织身份打到旧组织的行。
    await openRemoveDialogFor('Ada of A')

    server.tenant = 'org-b'
    postFromOtherTab('tenant-switched')

    expect(await screen.findByText('Bob of B')).toBeTruthy()
    expect(screen.queryByText('Ada of A')).toBeNull()
    await waitFor(() => expect(screen.queryByText('Remove member?')).toBeNull())
    expect(server.memberFetches).toEqual(['org-a', 'org-b'])
  })

  it('tenant switch elsewhere: a page that does not subscribe to router state refetches too', async () => {
    renderAdmin('/admin/widgets')
    expect(await screen.findByText('widget-of-A')).toBeTruthy()

    server.tenant = 'org-b'
    postFromOtherTab('tenant-switched')

    expect(await screen.findByText('widget-of-B')).toBeTruthy()
    expect(screen.queryByText('widget-of-A')).toBeNull()
  })

  it('login elsewhere (maybe another account / organization): refreshes like a switch', async () => {
    renderAdmin()
    expect(await screen.findByText('Ada of A')).toBeTruthy()

    server.tenant = 'org-b'
    postFromOtherTab('login')

    expect(await screen.findByText('Bob of B')).toBeTruthy()
    expect(screen.queryByText('Ada of A')).toBeNull()
  })

  it('login elsewhere as another account in the same organization: remounts the page and drops dialogs of the previous account', async () => {
    renderAdmin()
    expect(await screen.findByText('Ada of A')).toBeTruthy()
    // 上一个账号打开的「移除 Ada」确认框:换了账号(组织不变)之后不能还开着 ——
    // 留着的话,点确认就会以新账号的身份执行上一个账号发起的操作。
    await openRemoveDialogFor('Ada of A')

    server.me = OTHER_ACCOUNT
    postFromOtherTab('login')

    // 侧栏换成新账号(路由 context 的 me 已按新会话更新),页面区随之重新挂载。
    expect(await screen.findByText('someone-else')).toBeTruthy()
    await waitFor(() => expect(screen.queryByText('Remove member?')).toBeNull())
    expect(await screen.findByText('Ada of A')).toBeTruthy()
  })

  it('logout elsewhere: goes to the login page and keeps nothing of the old session', async () => {
    const { queryClient, router } = renderAdmin()
    expect(await screen.findByText('Ada of A')).toBeTruthy()

    server.loggedIn = false
    postFromOtherTab('logout')

    expect(await screen.findByText('admin login page')).toBeTruthy()
    expect(router.state.location.pathname).toBe('/admin/login')
    expect(screen.queryByText('Ada of A')).toBeNull()
    // 显式匿名标记:回到后台要重新登录,守卫不再信任旧会话的缓存。
    expect(queryClient.getQueryData(['admin', 'auth', 'me'])).toBeNull()
    // 上一个会话的数据一条不留(剩下的只有匿名标记)。
    await waitFor(() => expect(queryClient.isFetching()).toBe(0))
    expect(queryClient.getQueryCache().getAll().map(query => query.state.data ?? null)).toEqual(
      queryClient.getQueryCache().getAll().map(() => null),
    )
    // 不以已经结束的会话再发请求(否则 401 → 刷新梯 → 「会话过期」提示)。
    expect(server.requestsWhileLoggedOut).toEqual([])
  })
})
