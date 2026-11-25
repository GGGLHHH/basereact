import type { ClientErrorKind, ClientErrorReport } from '@/generated/api-types'

/**
 * 前端错误上报:把浏览器里的未捕获异常、没人处理的 Promise 拒绝、路由错误边界接住的渲染错误
 * 报给后端(`POST /api/v1/public/client-errors`),在后台「系统监控 → 日志」按「前端」查看。
 *
 * - 只在生产构建里开(开发时错误就在控制台和 Vite 浮层里,不往日志库灌);
 * - 同一个错误(类型 + 消息 + 栈顶)一次页面加载只报一次,一次页面加载最多报 {@link MAX_PER_PAGE} 条;
 * - 各字段按后端的上限截断,一批不超过 {@link MAX_BODY_BYTES} 字节;
 * - 攒 {@link FLUSH_DELAY_MS} 毫秒一批发,页面隐藏 / 关掉时用 sendBeacon 把剩下的发出去;
 * - 带上前端版本(构建时的 `VITE_APP_RELEASE`,部署包里是前端仓库的提交号);
 * - 浏览器扩展、跨域脚本(只有 "Script error.")、ResizeObserver 循环这类和本站代码无关的噪声直接丢。
 *
 * 不走 api-client:上报自己出错不能再触发上报,也不需要它的 401 跳转之类处理。
 */

const ENDPOINT = '/api/v1/public/client-errors'
export const MAX_BATCH = 10
export const MAX_PER_PAGE = 20
export const FLUSH_DELAY_MS = 2000
/** 一次请求体的上限:后端收 64 KB;keepalive 的 fetch 和 sendBeacon 在浏览器里也共用 64 KB 额度。 */
export const MAX_BODY_BYTES = 60 * 1024
// 和后端(baserust src/app/client_errors.rs)的截断长度一致
export const MAX_MESSAGE_CHARS = 1000
export const MAX_STACK_CHARS = 4000
const MAX_SHORT_CHARS = 300

const RELEASE_ENV = import.meta.env.VITE_APP_RELEASE as string | undefined
const RELEASE = RELEASE_ENV != null && RELEASE_ENV !== '' ? RELEASE_ENV : undefined

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

/** 截断(按码点切,别切开代理对:半个代理对的 JSON 后端解析不了)。 */
function clip(s: string, max: number): string {
  if (s.length <= max)
    return s
  return `${Array.from(s.slice(0, max * 2)).slice(0, max).join('')}…`
}

/** 调用栈的栈顶帧:Chrome 第一行是消息,帧是 "    at …";Firefox / Safari 每行都是 "函数@地址"。 */
export function topFrame(stack?: string): string {
  if (stack == null)
    return ''
  const lines = stack.split('\n')
  return (lines.find(l => /^\s*at\s/.test(l)) ?? lines.find(l => l.includes('@')) ?? '').trim()
}

const encoder = new TextEncoder()

/** 从队首取一批:最多 {@link MAX_BATCH} 条,JSON 不超过 {@link MAX_BODY_BYTES} 字节(单条总是放得下)。 */
function takeBatch(queue: ClientErrorReport[]): ClientErrorReport[] {
  const batch: ClientErrorReport[] = []
  let bytes = '{"errors":[]}'.length
  for (const item of queue) {
    const n = encoder.encode(JSON.stringify(item)).length + 1
    if (batch.length >= MAX_BATCH || (batch.length > 0 && bytes + n > MAX_BODY_BYTES))
      break
    batch.push(item)
    bytes += n
  }
  return batch
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

export function createErrorReporter(sender: Sender, page: () => string, release = RELEASE) {
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
      const batch = takeBatch(queue)
      queue = queue.slice(batch.length)
      const body = JSON.stringify({ errors: batch })
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
    // 只看出错的位置(脚本地址 / 栈顶):扩展常包装 addEventListener、fetch,本站的错误栈中间也会夹着扩展的帧
    const top = topFrame(stack)
    if (EXTENSION_URL.test(source ?? '') || EXTENSION_URL.test(top))
      return
    const fingerprint = `${kind}|${message}|${top}`
    if (seen.has(fingerprint) || reported >= MAX_PER_PAGE)
      return
    seen.add(fingerprint)
    reported += 1
    queue.push({
      kind,
      message: clip(message, MAX_MESSAGE_CHARS),
      stack: stack == null ? undefined : clip(stack, MAX_STACK_CHARS),
      source: source == null ? undefined : clip(source, MAX_SHORT_CHARS),
      page: clip(page(), MAX_SHORT_CHARS),
      release,
    })
    if (queue.length >= MAX_BATCH)
      flush()
    else
      timer ??= setTimeout(flush, FLUSH_DELAY_MS)
  }

  return { report, flush }
}

function sendFetch(body: string) {
  void fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    keepalive: true,
    credentials: 'same-origin',
  }).catch(() => {})
}

const browserSender: Sender = {
  send: sendFetch,
  beacon: (body) => {
    // 少数 WebView 没有 sendBeacon;额度满了它返回 false。两种情况都退回 keepalive 的 fetch。
    const sent = typeof navigator.sendBeacon === 'function'
      && navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }))
    if (!sent)
      sendFetch(body)
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
  // 手机上切到后台后常被系统直接杀掉、收不到 pagehide:页面一隐藏就先发
  const onVisibility = () => {
    if (document.visibilityState === 'hidden')
      r.flush(true)
  }
  window.addEventListener('error', onError)
  window.addEventListener('unhandledrejection', onRejection)
  window.addEventListener('pagehide', onHide)
  document.addEventListener('visibilitychange', onVisibility)
  return () => {
    window.removeEventListener('error', onError)
    window.removeEventListener('unhandledrejection', onRejection)
    window.removeEventListener('pagehide', onHide)
    document.removeEventListener('visibilitychange', onVisibility)
    r.flush()
    reporter = undefined
  }
}
