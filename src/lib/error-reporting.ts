import type { ClientErrorKind, ClientErrorReport } from '#/generated/api-types'

/**
 * 前端错误上报:把浏览器里的未捕获异常、没人处理的 Promise 拒绝、路由错误边界接住的渲染错误
 * 报给后端(`POST /api/v1/public/client-errors`),在后台「系统监控 → 日志」按「前端」查看。
 *
 * - 只在生产构建里开(开发时错误就在控制台和 Vite 浮层里,不往日志库灌);
 * - 同一个错误(类型 + 消息 + 栈顶)一次页面加载只报一次,一次页面加载最多报 {@link MAX_PER_PAGE} 条;
 * - 攒 {@link FLUSH_DELAY_MS} 毫秒一批发,页面关掉时用 sendBeacon 把剩下的发出去;
 * - 浏览器扩展、跨域脚本(只有 "Script error.")、ResizeObserver 循环这类和本站代码无关的噪声直接丢。
 *
 * 不走 api-client:上报自己出错不能再触发上报,也不需要它的 401 跳转之类处理。
 */

const ENDPOINT = '/api/v1/public/client-errors'
export const MAX_BATCH = 10
export const MAX_PER_PAGE = 20
export const FLUSH_DELAY_MS = 2000

// 跨域脚本出错时浏览器只给 "Script error.",没有任何可用信息。
const NOISE = [
  /ResizeObserver loop/i,
  /^Script error\.?$/i,
]
const EXTENSION_URL = /(?:chrome|moz|safari(?:-web)?)-extension:\/\//i

export interface Sender {
  /** 普通发送(fetch keepalive)。 */
  send: (body: string) => void
  /** 页面关闭时发送(sendBeacon)。 */
  beacon: (body: string) => void
}

function describe(error: unknown): { message: string, stack?: string } {
  if (error instanceof Error) {
    return { message: error.message || error.name, stack: error.stack }
  }
  if (typeof error === 'string') {
    return { message: error }
  }
  try {
    return { message: JSON.stringify(error) ?? String(error) }
  }
  catch {
    return { message: String(error) }
  }
}

export function createErrorReporter(sender: Sender, page: () => string) {
  let queue: ClientErrorReport[] = []
  let reported = 0
  const seen = new Set<string>()
  let timer: ReturnType<typeof setTimeout> | undefined

  function flush(useBeacon = false) {
    if (timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
    }
    while (queue.length > 0) {
      const body = JSON.stringify({ errors: queue.slice(0, MAX_BATCH) })
      queue = queue.slice(MAX_BATCH)
      if (useBeacon)
        sender.beacon(body)
      else
        sender.send(body)
    }
  }

  function report(kind: ClientErrorKind, error: unknown, source?: string) {
    const { message, stack } = describe(error)
    if (NOISE.some(re => re.test(message)))
      return
    if ((source != null && EXTENSION_URL.test(source)) || (stack != null && EXTENSION_URL.test(stack)))
      return
    const fingerprint = `${kind}|${message}|${stack?.split('\n')[1]?.trim() ?? ''}`
    if (seen.has(fingerprint) || reported >= MAX_PER_PAGE)
      return
    seen.add(fingerprint)
    reported += 1
    queue.push({ kind, message, stack, source, page: page() })
    if (queue.length >= MAX_BATCH)
      flush()
    else
      timer ??= setTimeout(flush, FLUSH_DELAY_MS)
  }

  return { report, flush }
}

const browserSender: Sender = {
  send: (body) => {
    void fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      keepalive: true,
      credentials: 'same-origin',
    }).catch(() => {})
  },
  beacon: (body) => {
    navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }))
  },
}

let reporter: ReturnType<typeof createErrorReporter> | undefined

/** 是否上报:生产构建才开。 */
function enabled() {
  return typeof window !== 'undefined' && import.meta.env.PROD
}

/** 报一个错误(路由错误边界等手动调用)。没开时什么都不做。 */
export function reportClientError(kind: ClientErrorKind, error: unknown, source?: string) {
  reporter?.report(kind, error, source)
}

/** 挂全局监听(客户端调一次),返回卸载函数。 */
export function installErrorReporting(): () => void {
  if (!enabled() || reporter != null)
    return () => {}
  const r = createErrorReporter(browserSender, () => window.location.pathname)
  reporter = r
  const onError = (e: ErrorEvent) => {
    // 先去掉脚本地址里的 query / hash(后端也会去),否则后面的行列号会被一起截掉。
    const source = e.filename ? `${e.filename.split(/[?#]/)[0]}:${e.lineno}:${e.colno}` : undefined
    r.report('error', e.error ?? e.message, source)
  }
  const onRejection = (e: PromiseRejectionEvent) => r.report('unhandled_rejection', e.reason)
  const onHide = () => r.flush(true)
  window.addEventListener('error', onError)
  window.addEventListener('unhandledrejection', onRejection)
  window.addEventListener('pagehide', onHide)
  return () => {
    window.removeEventListener('error', onError)
    window.removeEventListener('unhandledrejection', onRejection)
    window.removeEventListener('pagehide', onHide)
    r.flush()
    reporter = undefined
  }
}
