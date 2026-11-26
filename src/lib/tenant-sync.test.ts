// @vitest-environment happy-dom

import { QueryClient } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { broadcastTenantChanged, TENANT_CHANNEL, useTenantSync } from './tenant-sync'

const h = vi.hoisted(() => ({
  router: null as null | { invalidate: () => Promise<void>, options: { context: { queryClient: unknown } } },
}))

vi.mock('@tanstack/react-router', async importOriginal => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useRouter: () => h.router,
}))

const opened: BroadcastChannel[] = []
function otherTab(): BroadcastChannel {
  const channel = new BroadcastChannel(TENANT_CHANNEL)
  opened.push(channel)
  return channel
}

afterEach(() => {
  for (const channel of opened.splice(0)) {
    channel.close()
  }
  h.router = null
})

function setup() {
  const queryClient = new QueryClient()
  queryClient.setQueryData(['widgets', 'list', {}], { items: ['tenant-a-row'] })
  const invalidate = vi.fn().mockResolvedValue(undefined)
  h.router = { invalidate, options: { context: { queryClient } } }
  const hook = renderHook(() => useTenantSync())
  return { hook, invalidate, queryClient }
}

describe('tenant sync across tabs', () => {
  it('other_tab_reloads_on_tenant_changed', async () => {
    const { hook, invalidate, queryClient } = setup()

    // 另一个标签页切了租户:本页清缓存 + 重新进入当前路由。
    otherTab().postMessage({ senderId: 'other-tab', tenantId: 't2', type: 'tenant-changed' })

    await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(1))
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
    hook.unmount()
  })

  it('ignores unrelated messages on the channel', async () => {
    const { hook, invalidate, queryClient } = setup()

    otherTab().postMessage({ type: 'something-else' })
    otherTab().postMessage('garbage')
    // 再发一条真消息作为「之前的都已处理」的栅栏。
    await new Promise(resolve => setTimeout(resolve, 20))
    expect(invalidate).not.toHaveBeenCalled()
    expect(queryClient.getQueryCache().getAll()).toHaveLength(1)
    hook.unmount()
  })

  it('ignores its own broadcast so the switching tab does not refresh twice', async () => {
    const { hook, invalidate, queryClient } = setup()
    // 栅栏:另一个监听者收到这条消息时,本页的监听者也一定已经处理过了。
    const fence: unknown[] = []
    otherTab().onmessage = (event: MessageEvent) => fence.push(event.data)

    // 本页自己切换后的广播:刷新已由 useSwitchTenant 做过,监听者必须忽略。
    broadcastTenantChanged('t2')

    await waitFor(() => expect(fence).toHaveLength(1))
    await new Promise(resolve => setTimeout(resolve, 20))
    expect(invalidate).not.toHaveBeenCalled()
    expect(queryClient.getQueryCache().getAll()).toHaveLength(1)
    hook.unmount()
  })

  it('stops listening after unmount', async () => {
    const { hook, invalidate } = setup()
    hook.unmount()

    otherTab().postMessage({ senderId: 'other-tab', tenantId: 't2', type: 'tenant-changed' })
    await new Promise(resolve => setTimeout(resolve, 20))
    expect(invalidate).not.toHaveBeenCalled()
  })

  it('broadcastTenantChanged reaches the other tabs', async () => {
    const received: unknown[] = []
    otherTab().onmessage = (event: MessageEvent) => received.push(event.data)

    broadcastTenantChanged('t9')

    await waitFor(() => expect(received).toHaveLength(1))
    expect(received[0]).toMatchObject({ tenantId: 't9', type: 'tenant-changed' })
    expect(typeof (received[0] as { senderId?: unknown }).senderId).toBe('string')
  })
})
