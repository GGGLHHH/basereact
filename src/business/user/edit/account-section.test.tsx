// @vitest-environment happy-dom

import type { AdminUserView } from '#/generated/api-types'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AccountSection } from './account-section'

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const h = vi.hoisted(() => ({ mutateAsync: vi.fn() }))
vi.mock('@/api/users', () => ({
  useUpdateUser: () => ({ isPending: false, mutateAsync: h.mutateAsync }),
}))

function fakeUser(overrides: Partial<AdminUserView> = {}): AdminUserView {
  return {
    avatar_url: null,
    created_at: '2026-01-01T00:00:00Z',
    display_name: 'Ada',
    email: 'ada@example.com',
    email_verified: true,
    id: 'u1',
    roles: ['admin'],
    username: 'ada',
    ...overrides,
  }
}

beforeEach(() => {
  h.mutateAsync.mockReset().mockResolvedValue(fakeUser())
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('accountSection', () => {
  it('seeds username/email and saves an UpdateUserRequest (email cleared to null)', async () => {
    render(<AccountSection user={fakeUser()} />)

    expect(screen.getByLabelText<HTMLInputElement>(/Username/).value).toBe('ada')

    fireEvent.change(screen.getByLabelText(/Username/), { target: { value: 'ada2' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(h.mutateAsync).toHaveBeenCalledWith({
        id: 'u1',
        request: { email: null, username: 'ada2' },
      }),
    )
  })
})
