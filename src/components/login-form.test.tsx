// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiErrorClass } from '@/lib/api-client'

import { LoginForm } from './login-form'

const h = vi.hoisted(() => ({
  adminLogin: vi.fn(),
  navigate: vi.fn(),
  userLogin: vi.fn(),
}))

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock('@tanstack/react-router', async importOriginal => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useNavigate: () => h.navigate,
}))
vi.mock('@/api/auth', () => ({
  frontendLandingAfterLogin: vi.fn().mockResolvedValue('/frontend/home'),
  useAdminLogin: () => ({ isPending: false, mutateAsync: h.adminLogin }),
  useLogin: () => ({ isPending: false, mutateAsync: h.userLogin }),
}))
vi.mock('@tanstack/react-query', async importOriginal => ({
  ...(await importOriginal<typeof import('@tanstack/react-query')>()),
  useQueryClient: () => ({}),
}))

beforeEach(() => {
  h.adminLogin.mockReset()
  h.userLogin.mockReset()
  h.navigate.mockReset().mockResolvedValue(undefined)
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

async function submit(identifier: string, password: string) {
  fireEvent.change(screen.getByLabelText(/Email or username/), { target: { value: identifier } })
  fireEvent.change(screen.getByLabelText(/Password/), { target: { value: password } })
  fireEvent.click(screen.getByRole('button', { name: 'Login' }))
}

describe('loginForm', () => {
  it('explains tenant_required on the admin login in the UI language and stays on the login page', async () => {
    // 后台登录:账号不属于任何组织、也没有平台权限 → 后端 403 tenant_required,不发 token。
    h.adminLogin.mockRejectedValue(
      new ApiErrorClass('A current tenant is required', { code: 'tenant_required', status: 403 }),
    )
    render(<LoginForm />)

    await submit('lonely', 'pw')

    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1))
    const message = vi.mocked(toast.error).mock.calls[0]?.[0]
    // 翻译过的说明(不属于任何组织、联系管理员),不是后端的英文原文。
    expect(message).toMatch(/doesn't belong to any organization/)
    expect(message).toMatch(/contact an administrator/)
    expect(message).not.toBe('A current tenant is required')
    expect(h.navigate).not.toHaveBeenCalled()
  })

  it('still shows the server message for other login errors', async () => {
    h.adminLogin.mockRejectedValue(new ApiErrorClass('Invalid credentials', { code: 'unauthorized', status: 401 }))
    render(<LoginForm />)

    await submit('alice', 'wrong')

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Invalid credentials'))
    expect(h.navigate).not.toHaveBeenCalled()
  })

  it('goes to the admin home after a successful admin login', async () => {
    h.adminLogin.mockResolvedValue({ email_verified: false, id: 'u1', roles: [], username: 'alice' })
    render(<LoginForm />)

    await submit('alice', 'pw')

    await waitFor(() => expect(h.navigate).toHaveBeenCalledWith({ to: '/admin/home' }))
    expect(toast.error).not.toHaveBeenCalled()
  })
})
