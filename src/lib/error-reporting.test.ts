import type { Sender } from './error-reporting'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import {
  createErrorReporter,
  FLUSH_DELAY_MS,
  MAX_BATCH,
  MAX_BODY_BYTES,
  MAX_MESSAGE_CHARS,
  MAX_PER_PAGE,
  MAX_STACK_CHARS,
  topFrame,
} from './error-reporting'

let sent: string[]
let beacons: string[]
let sender: Sender

beforeEach(() => {
  vi.useFakeTimers()
  sent = []
  beacons = []
  sender = { send: b => sent.push(b), beacon: b => beacons.push(b) }
})

afterEach(() => {
  vi.useRealTimers()
})

function errorsOf(body: string) {
  return (JSON.parse(body) as { errors: { kind: string, message: string, page: string, stack?: string, release?: string }[] }).errors
}

it('攒一会儿再成批发,带上当前页面', () => {
  const r = createErrorReporter(sender, () => '/admin/users')
  r.report('error', new Error('a'))
  r.report('unhandled_rejection', 'b')
  expect(sent).toHaveLength(0)
  vi.advanceTimersByTime(FLUSH_DELAY_MS)
  expect(sent).toHaveLength(1)
  expect(errorsOf(sent[0]).map(e => [e.kind, e.message, e.page])).toEqual([
    ['error', 'a', '/admin/users'],
    ['unhandled_rejection', 'b', '/admin/users'],
  ])
})

it('同一个错误只报一次,一页最多报 MAX_PER_PAGE 条', () => {
  const r = createErrorReporter(sender, () => '/')
  const same = new Error('same')
  r.report('render', same)
  r.report('render', same)
  for (let i = 0; i < MAX_PER_PAGE + 5; i++)
    r.report('error', `e${i}`)
  r.flush()
  const all = sent.flatMap(errorsOf)
  expect(all).toHaveLength(MAX_PER_PAGE)
  expect(all.filter(e => e.message === 'same')).toHaveLength(1)
  expect(sent.every(b => errorsOf(b).length <= MAX_BATCH)).toBe(true)
})

it('满一批立刻发', () => {
  const r = createErrorReporter(sender, () => '/')
  for (let i = 0; i < MAX_BATCH; i++)
    r.report('error', `e${i}`)
  expect(sent).toHaveLength(1)
})

it('丢掉和本站代码无关的噪声', () => {
  const r = createErrorReporter(sender, () => '/')
  r.report('error', 'Script error.')
  r.report('error', 'ResizeObserver loop completed with undelivered notifications.')
  r.report('error', 'x', 'chrome-extension://abc/content.js:1:1')
  const ext = new Error('y')
  ext.stack = 'Error: y\n    at moz-extension://abc/a.js:1:1'
  r.report('error', ext)
  r.flush()
  expect(sent).toHaveLength(0)
})

it('页面关闭时用 beacon 发剩下的', () => {
  const r = createErrorReporter(sender, () => '/')
  r.report('error', 'late')
  r.flush(true)
  expect(beacons).toHaveLength(1)
  expect(sent).toHaveLength(0)
  vi.advanceTimersByTime(FLUSH_DELAY_MS)
  expect(sent).toHaveLength(0)
})

it('按后端上限截断,一批不超过请求体上限,带上版本', () => {
  const r = createErrorReporter(sender, () => '/', 'abc123')
  for (let i = 0; i < MAX_BATCH; i++) {
    const e = new Error(`${i}${'消'.repeat(MAX_MESSAGE_CHARS * 3)}`)
    e.stack = `Error\n    at f${i} (/a.js:1:1)\n${'栈'.repeat(MAX_STACK_CHARS * 3)}`
    r.report('error', e)
  }
  r.flush()
  expect(sent.length).toBeGreaterThan(1)
  for (const body of sent)
    expect(new TextEncoder().encode(body).length).toBeLessThanOrEqual(MAX_BODY_BYTES)
  const all = sent.flatMap(errorsOf)
  expect(all).toHaveLength(MAX_BATCH)
  expect(Array.from(all[0].message)).toHaveLength(MAX_MESSAGE_CHARS + 1)
  expect(Array.from(all[0].stack ?? '')).toHaveLength(MAX_STACK_CHARS + 1)
  expect(all[0].release).toBe('abc123')
})

it('栈顶帧:跳过 Chrome 的消息行,扩展帧不在栈顶就照报', () => {
  expect(topFrame('Error: a@b.com 不对\n    at f (/a.js:1:2)\n    at g (/b.js:3:4)')).toBe('at f (/a.js:1:2)')
  expect(topFrame('f@https://h/a.js:1:2\ng@https://h/b.js:3:4')).toBe('f@https://h/a.js:1:2')
  const r = createErrorReporter(sender, () => '/')
  const e = new Error('mine')
  e.stack = 'Error: mine\n    at f (/assets/app.js:1:1)\n    at chrome-extension://abc/hook.js:2:2'
  r.report('error', e)
  r.flush()
  expect(sent.flatMap(errorsOf).map(x => x.message)).toEqual(['mine'])
})
