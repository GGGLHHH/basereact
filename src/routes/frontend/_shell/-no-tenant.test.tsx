// @vitest-environment happy-dom

import type { ReactNode } from 'react'
import type { MyTenantView } from '@/generated/api-types'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { FrontendNoTenantPage } from './-no-tenant-page'

const h = vi.hoisted(() => ({
  navigate: vi.fn(),
  switchTenant: vi.fn(),
  tenants: { data: undefined as MyTenantView[] | undefined, isPending: false },
}))

vi.mock('@/api/auth', () => ({
  useMyTenants: () => h.tenants,
  useSwitchTenant: () => ({ isPending: false, mutate: h.switchTenant }),
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: { children?: ReactNode, to: string }) => (
    <a
      href={to}
      {...props}
    >
      {children}
    </a>
  ),
  useNavigate: () => h.navigate,
}))

beforeEach(() => {
  h.tenants = { data: [], isPending: false }
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('frontendNoTenantPage', () => {
  it('no_tenant_user_sees_empty_state', () => {
    render(<FrontendNoTenantPage />)

    expect(screen.getByText('Not in any organization yet')).toBeTruthy()
    expect(screen.getByText(/Ask an administrator to add you/)).toBeTruthy()
    // 登出在顶栏;页内只给回公开首页的出口。
    expect(screen.getByRole('link', { name: 'Home' }).getAttribute('href')).toBe('/frontend/home')
  })

  it('falls back to the empty state when the list cannot be read', () => {
    h.tenants = { data: undefined, isPending: false }
    render(<FrontendNoTenantPage />)

    expect(screen.getByText('Not in any organization yet')).toBeTruthy()
  })

  // 平台上下文里只属于 1 个组织:顶栏没有切换器(≥ 2 才出现),这页是唯一入口。
  it('lets a member of a single organization enter it', async () => {
    h.tenants = { data: [{ current: false, id: 't1', name: 'Acme', roles: ['user'], slug: 'acme' }], isPending: false }
    h.switchTenant.mockImplementation((_id: string, options: { onSuccess: () => void }) => options.onSuccess())
    render(<FrontendNoTenantPage />)

    expect(screen.queryByText('Not in any organization yet')).toBeNull()
    expect(screen.getByText('Choose an organization')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Home' }).getAttribute('href')).toBe('/frontend/home')

    fireEvent.click(screen.getByRole('button', { name: /Acme/ }))

    expect(h.switchTenant).toHaveBeenCalledWith('t1', expect.anything())
    await waitFor(() => expect(h.navigate).toHaveBeenCalledWith({ to: '/frontend/home' }))
  })
})
