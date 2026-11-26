// @vitest-environment happy-dom

import type { ReactNode } from 'react'
import type { MyTenantView } from '@/generated/api-types'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ForbiddenScreen } from './error-state'

const h = vi.hoisted(() => ({
  navigate: vi.fn(),
  tenants: undefined as MyTenantView[] | undefined,
  useMyTenants: vi.fn(),
}))

vi.mock('@/api/auth', () => ({
  useMyTenants: (options?: unknown) => {
    h.useMyTenants(options)
    return { data: h.tenants }
  },
  useSwitchTenant: () => ({ isPending: false, mutate: vi.fn() }),
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

// ErrorState 的按钮要路由:Link 换成普通锚点,history.back / navigate 打桩。
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
  useRouter: () => ({ history: { back: vi.fn() } }),
}))

function tenant(id: string, name: string, current = false): MyTenantView {
  return { current, id, name, roles: ['user'], slug: id }
}

afterEach(() => {
  cleanup()
  h.tenants = undefined
  vi.clearAllMocks()
})

describe('forbiddenScreen', () => {
  it('offers the tenant switcher when the account belongs to two or more tenants', () => {
    // 切到没有后台权限的租户后落在这里:给出切回去的路,不是死路。
    h.tenants = [tenant('t1', 'Default Org'), tenant('t2', 'Demo Org', true)]
    render(<ForbiddenScreen />)

    expect(screen.getByText('403')).toBeTruthy()
    expect(document.querySelector('[data-tenant-switcher]')?.textContent).toContain('Demo Org')
    // 软探测:匿名访客看 /403 不能被 401 刷新梯弹去登录页。
    expect(h.useMyTenants).toHaveBeenCalledWith({ soft: true })
  })

  it('shows no tenant element for single-tenant or anonymous visitors', () => {
    h.tenants = [tenant('t1', 'Default Org', true)]
    render(<ForbiddenScreen />)
    expect(document.querySelector('[data-tenant-switcher]')).toBeNull()
    cleanup()

    h.tenants = undefined
    render(<ForbiddenScreen />)
    expect(document.querySelector('[data-tenant-switcher]')).toBeNull()
  })
})
