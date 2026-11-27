import type { QueryClient } from '@tanstack/react-query'
import type { LinkProps } from '@tanstack/react-router'
import { useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'

import { LOGIN_ROUTE } from '@/lib/api-client'
import { queryKeys } from '@/lib/query-keys'

/**
 * 多标签页会话同步(spec §6.1):会话(登录账号 + 当前租户)放在所有标签页共享的 cookie 里。
 * 任何一个标签页改了它 —— 切换组织、登录(可能换了账号 / 组织)、登出 —— 其他标签页手里的缓存
 * 和页面就都属于上一个会话了。改了会话的标签页经 BroadcastChannel 广播 `session-changed`,
 * 其他标签页收到后按 reason 刷新(见 useSessionSync)。不做「每个标签页各自一个租户」。
 *
 * BroadcastChannel 只是不投回「发消息的那个 channel 实例」;本页的监听者是另一个实例,
 * 照样会收到本页自己的广播。所以每条消息带上本标签页的 senderId,监听者忽略自己发的 ——
 * 发送方自己的刷新由发起的 mutation 负责(见 api/auth.ts),不能再刷一次。
 */
export const SESSION_CHANNEL = 'basereact:session'

/** 会话怎么变的:登录 / 登出 / 切换当前组织。 */
export type SessionChangeReason = 'login' | 'logout' | 'tenant-switched'

interface SessionChangedMessage {
  type: 'session-changed'
  reason: SessionChangeReason
  /** 发出广播的标签页(本模块实例)的 id,用来忽略自己的广播。 */
  senderId: string
}

const REASONS: readonly SessionChangeReason[] = ['login', 'logout', 'tenant-switched']

// 每个标签页(每次加载本模块)一个 id。
const TAB_ID = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
  ? crypto.randomUUID()
  : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

function isSessionChanged(data: unknown): data is SessionChangedMessage {
  return typeof data === 'object'
    && data !== null
    && (data as { type?: unknown }).type === 'session-changed'
    && REASONS.includes((data as { reason?: unknown }).reason as SessionChangeReason)
    && typeof (data as { senderId?: unknown }).senderId === 'string'
}

// SSR / 老环境没有 BroadcastChannel:同步降级为不做(单标签页照常工作)。
function hasChannel(): boolean {
  return typeof BroadcastChannel !== 'undefined'
}

/** 通知其他标签页:会话变了。用完即关,不留常驻句柄。 */
export function broadcastSessionChanged(reason: SessionChangeReason): void {
  if (!hasChannel()) {
    return
  }
  const channel = new BroadcastChannel(SESSION_CHANNEL)
  const message: SessionChangedMessage = { reason, senderId: TAB_ID, type: 'session-changed' }
  channel.postMessage(message)
  channel.close()
}

/** 订阅其他标签页的会话变更(本标签页自己的广播被忽略);返回取消订阅。 */
function onSessionChanged(handler: (reason: SessionChangeReason) => void): () => void {
  if (!hasChannel()) {
    return () => {}
  }
  const channel = new BroadcastChannel(SESSION_CHANNEL)
  channel.onmessage = (event: MessageEvent) => {
    if (isSessionChanged(event.data) && event.data.senderId !== TAB_ID) {
      handler(event.data.reason)
    }
  }
  return () => channel.close()
}

/**
 * 会话仍在、但换了身份(切换组织 / 别处登录):让当前页面按新会话重新取数。
 *
 * 用 resetQueries 而不是 clear():clear() 把查询从缓存里删掉,已挂载的 useQuery 仍绑在被删的
 * 旧查询对象上,不重取、继续显示上一个会话的数据,直到组件碰巧重渲染;router.invalidate()
 * 只重跑守卫 / loader,不保证页面组件重渲染。resetQueries 把**所有**查询就地重置回无数据
 * (旧数据当场从页面消失,keepPreviousData 也拿不到旧行当占位),并立刻重取正在显示的那些;
 * 没挂载的下次用到时再取。之后 router.invalidate() 让守卫按新会话重跑(新组织里没权限的页面
 * 会被转走)。后台壳另按当前组织给页面加 key(见 -shell-layout.tsx),页面整棵重新挂载,
 * 指向旧行的弹窗等页面内状态一并丢掉。
 */
export async function refreshSession(
  queryClient: QueryClient,
  router: { invalidate: () => Promise<unknown> },
): Promise<void> {
  await queryClient.resetQueries()
  await router.invalidate()
}

const FRONTEND_LOGIN_ROUTE = '/frontend/login' satisfies LinkProps['to']

function markAnonymous(queryClient: QueryClient): void {
  queryClient.setQueryData(queryKeys.admin.auth.me(), null)
  queryClient.setQueryData(queryKeys.auth.me(), null)
}

/**
 * 会话已在别的标签页结束(登出 / 全部登出 / 注销账号):回所在 surface 的登录页,丢掉全部缓存,
 * 留下显式匿名标记(守卫见 null 直转登录,不再发注定 401 的探针)。
 *
 * 顺序有讲究:先写匿名标记(登录页的 guest 闸见到缓存里的旧用户会把人弹回首页)→ 导航(卸掉
 * 当前页面,上一个会话的数据离开屏幕)→ 再 clear()。反过来先 clear() 的话,导航途中重渲染的
 * 组件会重新绑到空查询上、以已经失效的会话发一串请求,401 还会触发刷新梯和「会话过期」提示。
 */
export async function leaveEndedSession(
  queryClient: QueryClient,
  router: { navigate: (options: { to: typeof LOGIN_ROUTE | typeof FRONTEND_LOGIN_ROUTE }) => Promise<unknown>, state: { location: { pathname: string } } },
): Promise<void> {
  await queryClient.cancelQueries()
  markAnonymous(queryClient)
  const pathname = router.state.location.pathname
  const target = pathname.startsWith('/frontend') ? FRONTEND_LOGIN_ROUTE : LOGIN_ROUTE
  if (pathname !== target) {
    await router.navigate({ to: target })
  }
  queryClient.clear()
  markAnonymous(queryClient)
}

/**
 * 根组件里挂一次:别的标签页改了会话 → 登出回登录页,其余按新会话刷新当前页面。
 * queryClient 从路由 context 取,与守卫用的是同一个实例。
 */
export function useSessionSync(): void {
  const router = useRouter()
  useEffect(() => onSessionChanged((reason) => {
    const { queryClient } = router.options.context
    void (reason === 'logout'
      ? leaveEndedSession(queryClient, router)
      : refreshSession(queryClient, router))
  }), [router])
}

/** 渲染即挂监听的空组件,给 RootDocument 用。 */
export function SessionSync(): null {
  useSessionSync()
  return null
}
