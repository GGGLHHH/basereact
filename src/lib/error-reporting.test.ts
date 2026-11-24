import type { Sender } from './error-reporting'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { createErrorReporter, FLUSH_DELAY_MS, MAX_BATCH, MAX_PER_PAGE } from './error-reporting'

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
  return (JSON.parse(body) as { errors: { kind: string, message: string, page: string }[] }).errors
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
