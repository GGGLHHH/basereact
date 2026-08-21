// @vitest-environment happy-dom

import type { ReactNode } from 'react'
import type { AdminUserView, ListUsersQuery, Page_AdminUserView } from '#/generated/api-types'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const listUsersMock = vi.fn<(options: { query?: ListUsersQuery }) => Promise<Page_AdminUserView>>()

vi.mock('#/generated/client', () => ({
  listUsers: listUsersMock,
}))

// 动态 import 是必须的:vi.mock 会被提升到文件顶部,静态 import 会在 listUsersMock
// 完成初始化之前就拉起整条依赖链(TDZ 报错)。但只加载**一次** —— 迁到 cadenza 之后
// 组件背后是 144 kB 的库包,原先每条测试 vi.resetModules() 都要把它重新解析一遍,
// 在并行跑全量时能把单条测试拖到 8 秒以上并随机超时。
let UserInfiniteSelect: Awaited<typeof componentPromise>['UserInfiniteSelect']
const componentPromise = import('./user-infinite-select')

// 加载放进 beforeAll 并单独给 30s:迁到 cadenza 之后这条依赖链是整个组件库,
// 并行跑全量时首条测试在自己的 5s 预算内付不完这笔加载,会随机超时 ——
// 而超时的测试不会走 cleanup,残留 DOM 又会把下一条一起带挂。
beforeAll(async () => {
  ({ UserInfiniteSelect } = await componentPromise)
}, 30_000)

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
class MockIntersectionObserver implements IntersectionObserver {
  root: Element | Document | null = null
  rootMargin = ''
  scrollMargin = ''
  thresholds: ReadonlyArray<number> = []
  constructor(_cb: IntersectionObserverCallback) {}
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
}

function makeUser(i: number, displayName?: string | null): AdminUserView {
  return {
    created_at: '2026-01-01T00:00:00Z',
    display_name: displayName === undefined ? `User ${i}` : displayName,
    email: null,
    email_verified: false,
    id: `user-${i}`,
    roles: [],
    username: `user${i}`,
  }
}

/** Cursor-mode page envelope, mirroring the backend's keyset `list_users`. */
function buildPage(
  count: number,
  size: number,
  nextCursor: string | null = null,
): Page_AdminUserView {
  const items: AdminUserView[] = []
  for (let i = 0; i < count; i++) {
    items.push(makeUser(i))
  }
  return {
    items,
    page_info: {
      mode: 'cursor',
      limit: size,
      next_cursor: nextCursor,
      has_more: nextCursor !== null,
    },
  }
}

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { gcTime: 0, retry: false, staleTime: 0 } },
  })
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
  return { Wrapper }
}

async function flushQueries() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', MockResizeObserver)
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
  if (!('PointerEvent' in window)) {
    vi.stubGlobal(
      'PointerEvent',
      class extends Event {
        constructor(type: string, init?: EventInit) {
          super(type, init)
        }
      },
    )
  }
  if (typeof (Element.prototype as { hasPointerCapture?: unknown }).hasPointerCapture !== 'function') {
    Element.prototype.hasPointerCapture = vi.fn<() => boolean>(() => false)
    Element.prototype.releasePointerCapture = vi.fn<() => void>()
    Element.prototype.setPointerCapture = vi.fn<() => void>()
  }
  Element.prototype.scrollIntoView = vi.fn<() => void>()
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('userInfiniteSelect', () => {
  it('renders the trigger children without fetching', async () => {
    listUsersMock.mockResolvedValue(buildPage(1, 20))
    const { Wrapper } = createWrapper()

    render(
      <UserInfiniteSelect onValueChange={vi.fn()}>
        <button type='button'>Open user picker</button>
      </UserInfiniteSelect>,
      { wrapper: Wrapper },
    )

    await flushQueries()
    expect(screen.getByText('Open user picker')).toBeTruthy()
    expect(listUsersMock).not.toHaveBeenCalled()
  })

  it('fetches users with an empty cursor seed after the popover opens', async () => {
    listUsersMock.mockResolvedValue(buildPage(1, 20))
    const { Wrapper } = createWrapper()

    render(
      <UserInfiniteSelect onValueChange={vi.fn()}>
        <button type='button'>Open</button>
      </UserInfiniteSelect>,
      { wrapper: Wrapper },
    )

    fireEvent.click(screen.getByText('Open'))
    await flushQueries()

    expect(listUsersMock).toHaveBeenCalledTimes(1)
    // First keyset page: empty cursor seeds it (backend maps '' to after=None).
    expect(listUsersMock).toHaveBeenCalledWith({ query: { size: 20, cursor: '' } })
    expect(await screen.findByText('User 0')).toBeTruthy()
  })

  it('falls back to username when display_name is null', async () => {
    listUsersMock.mockResolvedValue({
      items: [makeUser(0, null)],
      page_info: { mode: 'cursor', limit: 20, next_cursor: null, has_more: false },
    })
    const { Wrapper } = createWrapper()

    render(
      <UserInfiniteSelect
        defaultOpen
        onValueChange={vi.fn()}
      >
        <button type='button'>Open</button>
      </UserInfiniteSelect>,
      { wrapper: Wrapper },
    )

    await flushQueries()
    expect(await screen.findByText('user0')).toBeTruthy()
  })

  it('emits the picked user and closes on single-select', async () => {
    const user = makeUser(0)
    listUsersMock.mockResolvedValue({
      items: [user],
      page_info: { mode: 'cursor', limit: 20, next_cursor: null, has_more: false },
    })
    const { Wrapper } = createWrapper()
    const onChange = vi.fn()
    const onOpenChange = vi.fn<(open: boolean) => void>()

    render(
      <UserInfiniteSelect
        defaultOpen
        onValueChange={onChange}
        onOpenChange={onOpenChange}
      >
        <button type='button'>Open</button>
      </UserInfiniteSelect>,
      { wrapper: Wrapper },
    )

    await flushQueries()
    fireEvent.click(await screen.findByText('User 0'))

    // cadenza 的 onValueChange 多带一个 eventDetails(cancel 协议),只校验选中项本身。
    expect(onChange.mock.calls[0]?.[0]).toEqual(user)
    // onOpenChange 第二参是 cadenza 的 eventDetails,只校验开合本身。
    expect(onOpenChange.mock.calls.at(-1)?.[0]).toBe(false)
  })

  it('maps the search box to the username filter', async () => {
    vi.useFakeTimers()
    listUsersMock.mockResolvedValue(buildPage(1, 20))
    const { Wrapper } = createWrapper()

    render(
      <UserInfiniteSelect
        defaultOpen
        onValueChange={vi.fn()}
      >
        <button type='button'>Open</button>
      </UserInfiniteSelect>,
      { wrapper: Wrapper },
    )

    await flushQueries()
    const input = screen.getByPlaceholderText('Search user by name')
    fireEvent.change(input, { target: { value: 'ali' } })

    act(() => {
      vi.advanceTimersByTime(300)
    })
    await flushQueries()

    expect(listUsersMock).toHaveBeenLastCalledWith({
      query: { size: 20, cursor: '', username: 'ali' },
    })
  })
})
