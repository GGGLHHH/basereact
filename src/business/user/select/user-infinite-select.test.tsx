// @vitest-environment happy-dom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AdminUserView, ListUsersQuery, Page_AdminUserView } from '#/generated/api-types'

const listUsersMock = vi.fn<(options: { query?: ListUsersQuery }) => Promise<Page_AdminUserView>>()

vi.mock('#/generated/client', () => ({
  listUsers: listUsersMock,
}))

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
  if (!(Element.prototype as { hasPointerCapture?: unknown }).hasPointerCapture) {
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

async function loadComponent() {
  vi.resetModules()
  return import('./user-infinite-select')
}

describe('UserInfiniteSelect', () => {
  it('renders the trigger children without fetching', async () => {
    listUsersMock.mockResolvedValue(buildPage(1, 20))
    const { UserInfiniteSelect } = await loadComponent()
    const { Wrapper } = createWrapper()

    render(
      <UserInfiniteSelect onChange={vi.fn()}>
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
    const { UserInfiniteSelect } = await loadComponent()
    const { Wrapper } = createWrapper()

    render(
      <UserInfiniteSelect onChange={vi.fn()}>
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
    const { UserInfiniteSelect } = await loadComponent()
    const { Wrapper } = createWrapper()

    render(
      <UserInfiniteSelect
        defaultOpen
        onChange={vi.fn()}
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
    const { UserInfiniteSelect } = await loadComponent()
    const { Wrapper } = createWrapper()
    const onChange = vi.fn()
    const onOpenChange = vi.fn<(open: boolean) => void>()

    render(
      <UserInfiniteSelect
        defaultOpen
        onChange={onChange}
        onOpenChange={onOpenChange}
      >
        <button type='button'>Open</button>
      </UserInfiniteSelect>,
      { wrapper: Wrapper },
    )

    await flushQueries()
    fireEvent.click(await screen.findByText('User 0'))

    expect(onChange).toHaveBeenCalledWith(user)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('maps the search box to the username filter', async () => {
    vi.useFakeTimers()
    listUsersMock.mockResolvedValue(buildPage(1, 20))
    const { UserInfiniteSelect } = await loadComponent()
    const { Wrapper } = createWrapper()

    render(
      <UserInfiniteSelect
        defaultOpen
        onChange={vi.fn()}
      >
        <button type='button'>Open</button>
      </UserInfiniteSelect>,
      { wrapper: Wrapper },
    )

    await flushQueries()
    const input = screen.getByPlaceholderText('Search user by name') as HTMLInputElement
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
