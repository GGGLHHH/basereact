// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AdminUserView } from '#/generated/api-types'

import { UserTable } from './user-table'

// 渲染首行即可覆盖操作列行为(虚拟化在 jsdom 下无测量,mock 成只出 index 0)。
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: () => ({
    getTotalSize: () => 53,
    getVirtualItems: () => [{ end: 53, index: 0, key: '0', lane: 0, size: 53, start: 0 }],
  }),
}))

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function fakeUser(overrides: Partial<AdminUserView> = {}): AdminUserView {
  return {
    avatar_url: null,
    created_at: '2026-01-01T00:00:00Z',
    display_name: 'Ada Lovelace',
    email: 'ada@example.com',
    email_verified: true,
    id: 'u1',
    roles: ['admin'],
    username: 'ada',
    ...overrides,
  }
}

const noop = () => {}

interface Handlers {
  onRowClick?: (user: AdminUserView) => void
  onView?: (user: AdminUserView) => void
  onEdit?: (user: AdminUserView) => void
  onDelete?: (user: AdminUserView) => void
}

function renderTable(handlers: Handlers) {
  return render(
    <UserTable
      data={[fakeUser()]}
      isLoading={false}
      limit={20}
      page={1}
      total={1}
      onLimitChange={noop}
      onPageChange={noop}
      {...handlers}
    />,
  )
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', MockResizeObserver)
})

afterEach(() => {
  vi.unstubAllGlobals()
  cleanup()
})

describe('UserTable actions column', () => {
  it('renders view/edit/delete buttons for each row', () => {
    renderTable({ onView: noop, onEdit: noop, onDelete: noop })

    expect(screen.getByLabelText('View')).toBeTruthy()
    expect(screen.getByLabelText('Edit')).toBeTruthy()
    expect(screen.getByLabelText('Delete')).toBeTruthy()
  })

  it('fires the action handler without triggering row navigation (stopPropagation)', () => {
    const onEdit = vi.fn<(user: AdminUserView) => void>()
    const onRowClick = vi.fn<(user: AdminUserView) => void>()
    renderTable({ onEdit, onDelete: noop, onView: noop, onRowClick })

    fireEvent.click(screen.getByLabelText('Edit'))

    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'u1' }))
    expect(onRowClick).not.toHaveBeenCalled()
  })

  it('navigates to the row target on a plain row click', () => {
    const onRowClick = vi.fn<(user: AdminUserView) => void>()
    renderTable({ onRowClick, onView: noop, onEdit: noop, onDelete: noop })

    fireEvent.click(screen.getByText('ada'))

    expect(onRowClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'u1' }))
  })
})
