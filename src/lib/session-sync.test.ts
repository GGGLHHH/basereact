// @vitest-environment happy-dom

import { QueryClient } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { queryKeys } from '@/lib/query-keys'

import { broadcastSessionChanged, SESSION_CHANNEL, useSessionSync } from './session-sync'

interface FakeRouter {
  invalidate: () => Promise<void>
  navigate: (options: { to: string }) => Promise<void>
  options: { context: { queryClient: QueryClient } }
  state: { location: { pathname: string } }
}

const h = vi.hoisted(() => ({
  router: null as null | FakeRouter,
}))

vi.mock('@tanstack/react-router', async importOriginal => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useRouter: () => h.router,
}))

const opened: BroadcastChannel[] = []
function otherTab(): BroadcastChannel {
  const channel = new BroadcastChannel(SESSION_CHANNEL)
  opened.push(channel)
  return channel
}

afterEach(() => {
  for (const channel of opened.splice(0)) {
    channel.close()
  }
  h.router = null
})

function setup(pathname = '/admin/widgets') {
  const queryClient = new QueryClient()
  queryClient.setQueryData(queryKeys.widgets.list(), { items: ['tenant-a-row'] })
  queryClient.setQueryData(queryKeys.admin.auth.me(), { id: 'u1' })
  const invalidate = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
  const navigate = vi.fn<(options: { to: string }) => Promise<void>>().mockResolvedValue(undefined)
  h.router = { invalidate, navigate, options: { context: { queryClient } }, state: { location: { pathname } } }
  const hook = renderHook(() => useSessionSync())
  return { hook, invalidate, navigate, queryClient }
}

function fromOtherTab(reason: string) {
  otherTab().postMessage({ reason, senderId: 'other-tab', type: 'session-changed' })
}

describe('session sync across tabs', () => {
  it('other_tab_reloads_on_tenant_switched: resets every query and re-enters the route', async () => {
    const { hook, invalidate, navigate, queryClient } = setup()

    fromOtherTab('tenant-switched')

    await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(1))
    // 就地重置(不是删除):已挂载的 useQuery 留在同一个查询上,能看到重置并重取。
    expect(queryClient.getQueryCache().getAll()).toHaveLength(2)
    expect(queryClient.getQueryData(queryKeys.widgets.list())).toBeUndefined()
    expect(queryClient.getQueryData(queryKeys.admin.auth.me())).toBeUndefined()
    expect(navigate).not.toHaveBeenCalled()
    hook.unmount()
  })

  it('a login in another tab (maybe another account) refreshes like a switch', async () => {
    const { hook, invalidate, navigate, queryClient } = setup()

    fromOtherTab('login')

    await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(1))
    expect(queryClient.getQueryData(queryKeys.widgets.list())).toBeUndefined()
    expect(navigate).not.toHaveBeenCalled()
    hook.unmount()
  })

  it('a logout in another tab sends an admin page to the admin login and leaves only anonymous markers', async () => {
    const { hook, invalidate, navigate, queryClient } = setup('/admin/widgets')

    fromOtherTab('logout')

    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/admin/login' }))
    await waitFor(() => expect(queryClient.getQueryData(queryKeys.widgets.list())).toBeUndefined())
    expect(queryClient.getQueryData(queryKeys.admin.auth.me())).toBeNull()
    expect(queryClient.getQueryData(queryKeys.auth.me())).toBeNull()
    expect(invalidate).not.toHaveBeenCalled()
    hook.unmount()
  })

  it('a logout in another tab sends a frontend page to the frontend login', async () => {
    const { hook, navigate } = setup('/frontend/about')

    fromOtherTab('logout')

    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/frontend/login' }))
    hook.unmount()
  })

  it('does not navigate when already on the login page', async () => {
    const { hook, navigate, queryClient } = setup('/admin/login')

    fromOtherTab('logout')

    await waitFor(() => expect(queryClient.getQueryData(queryKeys.admin.auth.me())).toBeNull())
    await waitFor(() => expect(queryClient.getQueryData(queryKeys.widgets.list())).toBeUndefined())
    expect(navigate).not.toHaveBeenCalled()
    hook.unmount()
  })

  it('ignores unrelated messages on the channel', async () => {
    const { hook, invalidate, navigate, queryClient } = setup()

    otherTab().postMessage({ type: 'something-else' })
    otherTab().postMessage('garbage')
    // 老格式 / 未知 reason 都不认。
    otherTab().postMessage({ reason: 'exploded', senderId: 'other-tab', type: 'session-changed' })
    otherTab().postMessage({ senderId: 'other-tab', tenantId: 't2', type: 'tenant-changed' })
    await new Promise(resolve => setTimeout(resolve, 20))
    expect(invalidate).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
    expect(queryClient.getQueryData(queryKeys.widgets.list())).toEqual({ items: ['tenant-a-row'] })
    hook.unmount()
  })

  it('ignores its own broadcast so the tab that changed the session does not refresh twice', async () => {
    const { hook, invalidate, navigate, queryClient } = setup()
    // 栅栏:另一个监听者收到这些消息时,本页的监听者也一定已经处理过了。
    const fence: unknown[] = []
    otherTab().onmessage = (event: MessageEvent) => fence.push(event.data)

    // 本页自己的广播:刷新 / 跳转已由发起的 mutation 和调用方做过,监听者必须忽略。
    broadcastSessionChanged('tenant-switched')
    broadcastSessionChanged('login')
    broadcastSessionChanged('logout')

    await waitFor(() => expect(fence).toHaveLength(3))
    await new Promise(resolve => setTimeout(resolve, 20))
    expect(invalidate).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
    expect(queryClient.getQueryData(queryKeys.widgets.list())).toEqual({ items: ['tenant-a-row'] })
    hook.unmount()
  })

  it('stops listening after unmount', async () => {
    const { hook, invalidate } = setup()
    hook.unmount()

    fromOtherTab('tenant-switched')
    await new Promise(resolve => setTimeout(resolve, 20))
    expect(invalidate).not.toHaveBeenCalled()
  })

  it('broadcastSessionChanged reaches the other tabs with the reason and a sender id', async () => {
    const received: unknown[] = []
    otherTab().onmessage = (event: MessageEvent) => received.push(event.data)

    broadcastSessionChanged('logout')

    await waitFor(() => expect(received).toHaveLength(1))
    expect(received[0]).toMatchObject({ reason: 'logout', type: 'session-changed' })
    expect(typeof (received[0] as { senderId?: unknown }).senderId).toBe('string')
  })
})
