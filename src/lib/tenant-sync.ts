import { useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'

/**
 * 多标签页租户同步(spec §6.1):当前租户放在共享 cookie 里,一个标签页切换,
 * 其他标签页手里的缓存就都是上一个租户的数据了。切换成功的标签页经 BroadcastChannel
 * 广播 `tenant-changed`,其他标签页收到后清空查询缓存并重新进入当前路由。
 * 不做「每个标签页各自一个租户」。
 *
 * BroadcastChannel 只是不投回「发消息的那个 channel 实例」;本页的监听者是另一个实例,
 * 照样会收到本页自己的广播。所以每条消息带上本标签页的 senderId,监听者忽略自己发的 ——
 * 发送方自己的刷新由 useSwitchTenant 负责(见 api/auth.ts),不能再刷一次。
 */
export const TENANT_CHANNEL = 'basereact:tenant'

export interface TenantChangedMessage {
  type: 'tenant-changed'
  tenantId: string
  /** 发出广播的标签页(本模块实例)的 id,用来忽略自己的广播。 */
  senderId: string
}

// 每个标签页(每次加载本模块)一个 id。
const TAB_ID = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
  ? crypto.randomUUID()
  : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

function isTenantChanged(data: unknown): data is TenantChangedMessage {
  return typeof data === 'object'
    && data !== null
    && (data as { type?: unknown }).type === 'tenant-changed'
    && typeof (data as { tenantId?: unknown }).tenantId === 'string'
    && typeof (data as { senderId?: unknown }).senderId === 'string'
}

// SSR / 老环境没有 BroadcastChannel:同步降级为不做(单标签页照常工作)。
function hasChannel(): boolean {
  return typeof BroadcastChannel !== 'undefined'
}

/** 通知其他标签页:当前租户已换成 tenantId。用完即关,不留常驻句柄。 */
export function broadcastTenantChanged(tenantId: string): void {
  if (!hasChannel()) {
    return
  }
  const channel = new BroadcastChannel(TENANT_CHANNEL)
  const message: TenantChangedMessage = { senderId: TAB_ID, tenantId, type: 'tenant-changed' }
  channel.postMessage(message)
  channel.close()
}

/** 订阅其他标签页的租户切换(本标签页自己的广播被忽略);返回取消订阅。 */
export function onTenantChanged(handler: (tenantId: string) => void): () => void {
  if (!hasChannel()) {
    return () => {}
  }
  const channel = new BroadcastChannel(TENANT_CHANNEL)
  channel.onmessage = (event: MessageEvent) => {
    if (isTenantChanged(event.data) && event.data.senderId !== TAB_ID) {
      handler(event.data.tenantId)
    }
  }
  return () => channel.close()
}

/**
 * 根组件里挂一次:别的标签页切了租户 → 清空查询缓存 + router.invalidate()
 * (守卫 / loader 按新租户重跑,当前页重新取数)。queryClient 从路由 context 取,
 * 与守卫用的是同一个实例。
 */
export function useTenantSync(): void {
  const router = useRouter()
  useEffect(() => onTenantChanged(() => {
    router.options.context.queryClient.clear()
    void router.invalidate()
  }), [router])
}

/** 渲染即挂监听的空组件,给 RootDocument 用。 */
export function TenantSync(): null {
  useTenantSync()
  return null
}
