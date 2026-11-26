// @vitest-environment happy-dom

import type { MyTenantView } from '@/generated/api-types'
import { SidebarProvider } from '@gedatou/cadenza-ui'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { BRAND } from '@/brand'

import { TeamSwitcher, TenantMenu } from './team-switcher'

// 数据 / 切换动作由测试控制:切换器只关心「几个租户、哪个是当前、点了谁」。
const h = vi.hoisted(() => ({
  mutate: vi.fn(),
  tenants: undefined as MyTenantView[] | undefined,
}))

vi.mock('@/api/auth', () => ({
  useMyTenants: () => ({ data: h.tenants }),
  useSwitchTenant: () => ({ isPending: false, mutate: h.mutate }),
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

function tenant(id: string, name: string, current = false): MyTenantView {
  return { current, id, name, roles: ['user'], slug: id }
}

const TRIGGER = '[data-tenant-switcher]'

function renderSidebarSwitcher() {
  return render(
    <SidebarProvider>
      <TeamSwitcher />
    </SidebarProvider>,
  )
}

beforeEach(() => {
  h.tenants = undefined
  h.mutate.mockReset()
})

afterEach(() => {
  cleanup()
})

describe('teamSwitcher (admin sidebar)', () => {
  it('switcher_hidden_with_single_tenant', () => {
    h.tenants = [tenant('t1', 'Default Org', true)]
    renderSidebarSwitcher()

    // 单租户项目:侧栏只显示品牌,没有切换器、也不出现租户名(普通界面不出现租户元素)。
    expect(screen.getByText(BRAND.name)).toBeTruthy()
    expect(document.querySelector(TRIGGER)).toBeNull()
    expect(screen.queryByText('Default Org')).toBeNull()
  })

  it('shows only the brand while the tenant list is loading or empty', () => {
    renderSidebarSwitcher()
    expect(document.querySelector(TRIGGER)).toBeNull()
    cleanup()

    h.tenants = []
    renderSidebarSwitcher()
    expect(document.querySelector(TRIGGER)).toBeNull()
    expect(screen.getByText(BRAND.name)).toBeTruthy()
  })

  it('shows the current tenant and switches to the picked one with two or more tenants', async () => {
    h.tenants = [tenant('t1', 'Default Org', true), tenant('t2', 'Demo Org')]
    renderSidebarSwitcher()

    const trigger = document.querySelector<HTMLElement>(TRIGGER)
    expect(trigger).not.toBeNull()
    expect(trigger?.textContent).toContain('Default Org')

    fireEvent.click(trigger as HTMLElement)
    fireEvent.click(await screen.findByRole('menuitemradio', { name: /Demo Org/ }))

    expect(h.mutate).toHaveBeenCalledTimes(1)
    expect(h.mutate.mock.calls[0]?.[0]).toBe('t2')
  })

  it('does not call the switch endpoint when the current tenant is picked again', async () => {
    h.tenants = [tenant('t1', 'Default Org', true), tenant('t2', 'Demo Org')]
    renderSidebarSwitcher()

    fireEvent.click(document.querySelector<HTMLElement>(TRIGGER) as HTMLElement)
    fireEvent.click(await screen.findByRole('menuitemradio', { name: /Default Org/ }))

    expect(h.mutate).not.toHaveBeenCalled()
  })
})

describe('teamSwitcher without a current marker', () => {
  it('does not block picking any tenant when none is marked current', async () => {
    // 列表里没有 current(比如平台上下文):不能把第一个当成当前租户而吞掉对它的点击。
    h.tenants = [tenant('t1', 'Default Org'), tenant('t2', 'Demo Org')]
    renderSidebarSwitcher()

    fireEvent.click(document.querySelector<HTMLElement>(TRIGGER) as HTMLElement)
    fireEvent.click(await screen.findByRole('menuitemradio', { name: /Default Org/ }))

    expect(h.mutate.mock.calls[0]?.[0]).toBe('t1')
  })
})

describe('tenantMenu (frontend header)', () => {
  it('switcher_hidden_with_single_tenant', () => {
    h.tenants = [tenant('t1', 'Default Org', true)]
    const { container } = render(<TenantMenu />)

    // 顶栏变体单租户时什么都不渲染。
    expect(container.innerHTML).toBe('')
  })

  it('switches from the header menu with two or more tenants', async () => {
    h.tenants = [tenant('t1', 'Default Org', true), tenant('t2', 'Demo Org')]
    render(<TenantMenu />)

    const trigger = document.querySelector<HTMLElement>(TRIGGER)
    expect(trigger?.textContent).toContain('Default Org')
    fireEvent.click(trigger as HTMLElement)
    fireEvent.click(await screen.findByRole('menuitemradio', { name: /Demo Org/ }))

    expect(h.mutate.mock.calls[0]?.[0]).toBe('t2')
  })
})
