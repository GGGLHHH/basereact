// @vitest-environment happy-dom

import type { MyTenantView } from '@/generated/api-types'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AdminNoTenantPage } from './-no-tenant-page'

const h = vi.hoisted(() => ({
  logout: vi.fn(),
  navigate: vi.fn(),
  switchTenant: vi.fn(),
  tenants: { data: undefined as MyTenantView[] | undefined, isPending: false },
  tenantsOptions: vi.fn(),
}))

vi.mock('@/api/auth', () => ({
  useLogout: () => ({ isPending: false, mutateAsync: h.logout }),
  useMyTenants: (options?: unknown) => {
    h.tenantsOptions(options)
    return h.tenants
  },
  useSwitchTenant: () => ({ isPending: false, mutate: h.switchTenant }),
}))

vi.mock('@tanstack/react-router', async importOriginal => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useNavigate: () => h.navigate,
}))

function tenant(id: string, name: string): MyTenantView {
  return { current: false, id, name, roles: ['admin'], slug: id }
}

beforeEach(() => {
  h.tenants = { data: [], isPending: false }
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('adminNoTenantPage', () => {
  it('no_tenant_user_sees_empty_state', () => {
    render(<AdminNoTenantPage />)

    expect(screen.getByText('Not in any organization yet')).toBeTruthy()
    expect(screen.getByText(/Ask an administrator to add you/)).toBeTruthy()
    // 公开路由:列表走软探测,匿名访问不弹登录页。
    expect(h.tenantsOptions).toHaveBeenCalledWith({ soft: true })
  })

  it('logs out and returns to the login page', async () => {
    h.logout.mockResolvedValue(undefined)
    render(<AdminNoTenantPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Log out' }))

    await waitFor(() => expect(h.navigate).toHaveBeenCalledWith({ to: '/admin/login' }))
    expect(h.logout).toHaveBeenCalledTimes(1)
  })

  // 平台上下文里只属于 1 个组织:没有切换器(≥ 2 才出现),这页是唯一入口。
  it('lets a member of a single organization enter it', async () => {
    h.tenants = { data: [tenant('t1', 'Acme')], isPending: false }
    h.switchTenant.mockImplementation((_id: string, options: { onSuccess: () => void }) => options.onSuccess())
    render(<AdminNoTenantPage />)

    expect(screen.queryByText('Not in any organization yet')).toBeNull()
    expect(screen.getByText('Choose an organization')).toBeTruthy()
    // 出口仍在
    expect(screen.getByRole('button', { name: 'Log out' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Acme/ }))

    expect(h.switchTenant).toHaveBeenCalledWith('t1', expect.anything())
    await waitFor(() => expect(h.navigate).toHaveBeenCalledWith({ to: '/admin/home' }))
  })

  it('stays on the chooser when the switch fails', () => {
    h.tenants = { data: [tenant('t1', 'Acme'), tenant('t2', 'Globex')], isPending: false }
    h.switchTenant.mockImplementation((_id: string, options: { onError: (e: Error) => void }) =>
      options.onError(new Error('forbidden')))
    render(<AdminNoTenantPage />)

    fireEvent.click(screen.getByRole('button', { name: /Globex/ }))

    expect(h.switchTenant).toHaveBeenCalledWith('t2', expect.anything())
    expect(h.navigate).not.toHaveBeenCalled()
    expect(screen.getByText('Choose an organization')).toBeTruthy()
  })
})
