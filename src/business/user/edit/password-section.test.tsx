// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const h = vi.hoisted(() => ({ mutateAsync: vi.fn() }))
vi.mock('@/api/users', () => ({
  useResetUserPassword: () => ({ isPending: false, mutateAsync: h.mutateAsync }),
}))

import { PasswordSection } from './password-section'

beforeEach(() => {
  h.mutateAsync.mockReset().mockResolvedValue(undefined)
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('PasswordSection', () => {
  it('resets the password to the entered value', async () => {
    render(<PasswordSection userId='u1' />)

    fireEvent.change(screen.getByLabelText(/New password/), { target: { value: 'newpass1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }))

    await waitFor(() =>
      expect(h.mutateAsync).toHaveBeenCalledWith({ id: 'u1', newPassword: 'newpass1' }),
    )
  })

  it('blocks a too-short password', async () => {
    render(<PasswordSection userId='u1' />)

    fireEvent.change(screen.getByLabelText(/New password/), { target: { value: 'ab' } })
    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }))

    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(h.mutateAsync).not.toHaveBeenCalled()
  })
})
