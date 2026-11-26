// @vitest-environment happy-dom

import type { TenantView } from '@/generated/api-types'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { TenantStatusDialog } from './tenant-status-dialog'

const h = vi.hoisted(() => ({ currentTenantId: undefined as string | undefined, mutateAsync: vi.fn() }))

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock('@/lib/use-current-session', () => ({
  useCurrentTenantId: () => h.currentTenantId,
}))
vi.mock('@/api/tenants', () => ({
  useUpdateTenant: () => ({ isPending: false, mutateAsync: h.mutateAsync }),
}))

function tenant(overrides: Partial<TenantView> = {}): TenantView {
  return {
    created_at: '2026-11-01T00:00:00Z',
    id: 't1',
    name: 'Acme',
    slug: 'acme',
    status: 'active',
    updated_at: '2026-11-01T00:00:00Z',
    ...overrides,
  }
}

beforeEach(() => {
  h.currentTenantId = undefined
  h.mutateAsync.mockReset().mockImplementation(async ({ request }: { request: { status: string } }) =>
    tenant({ status: request.status as TenantView['status'] }))
})

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
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
  vi.unstubAllGlobals()
})

describe('tenantStatusDialog', () => {
  it('tenant_suspend_requires_confirmation', async () => {
    const onOpenChange = vi.fn<(open: boolean) => void>()
    render(
      <TenantStatusDialog
        open
        tenant={tenant()}
        onOpenChange={onOpenChange}
      />,
    )

    // 确认文案点名租户、讲清后果(成员被登出),打开本身不发请求。
    expect(screen.getByText('Suspend this organization?')).toBeTruthy()
    expect(screen.getByText(/Acme/)).toBeTruthy()
    expect(screen.getByText(/signed out/)).toBeTruthy()
    expect(h.mutateAsync).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Suspend' }))

    // PUT 全量:名称原样带上,只改状态。
    await waitFor(() =>
      expect(h.mutateAsync).toHaveBeenCalledWith({ id: 't1', request: { name: 'Acme', status: 'suspended' } }))
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })

  it('does nothing when the suspension is cancelled', () => {
    const onOpenChange = vi.fn<(open: boolean) => void>()
    render(
      <TenantStatusDialog
        open
        tenant={tenant()}
        onOpenChange={onOpenChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(h.mutateAsync).not.toHaveBeenCalled()
  })

  it('resumes a suspended tenant', async () => {
    render(
      <TenantStatusDialog
        open
        tenant={tenant({ status: 'suspended' })}
        onOpenChange={() => {}}
      />,
    )

    expect(screen.getByText('Resume this organization?')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }))

    await waitFor(() =>
      expect(h.mutateAsync).toHaveBeenCalledWith({ id: 't1', request: { name: 'Acme', status: 'active' } }))
  })

  it('keeps the dialog open when the request fails', async () => {
    h.mutateAsync.mockRejectedValue(new Error('boom'))
    const onOpenChange = vi.fn<(open: boolean) => void>()
    render(
      <TenantStatusDialog
        open
        tenant={tenant()}
        onOpenChange={onOpenChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Suspend' }))

    await waitFor(() => expect(h.mutateAsync).toHaveBeenCalled())
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })

  it('warns loudly when suspending the default organization', () => {
    render(
      <TenantStatusDialog
        open
        tenant={tenant({ id: '00000000-0000-0000-0000-000000000001', name: 'Default' })}
        onOpenChange={() => {}}
      />,
    )

    expect(screen.getByRole('alert').textContent).toContain('default organization')
  })

  it('warns loudly when suspending the organization the admin is currently in', () => {
    h.currentTenantId = 't1'
    render(
      <TenantStatusDialog
        open
        tenant={tenant()}
        onOpenChange={() => {}}
      />,
    )

    expect(screen.getByRole('alert').textContent).toContain('currently in')
  })

  it('shows no extra warning for another organization or when resuming', () => {
    h.currentTenantId = 'other'
    render(
      <TenantStatusDialog
        open
        tenant={tenant()}
        onOpenChange={() => {}}
      />,
    )
    expect(screen.queryByRole('alert')).toBeNull()
    cleanup()

    h.currentTenantId = 't1'
    render(
      <TenantStatusDialog
        open
        tenant={tenant({ status: 'suspended' })}
        onOpenChange={() => {}}
      />,
    )
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('keeps the copy it opened with while the target changes underneath', () => {
    const { rerender } = render(
      <TenantStatusDialog
        open
        tenant={tenant()}
        onOpenChange={() => {}}
      />,
    )

    // 停用成功后详情页的 tenant 翻成 suspended、列表页把目标清成 null —— 关闭动画期间文案不跳。
    rerender(
      <TenantStatusDialog
        open
        tenant={tenant({ name: 'Renamed', status: 'suspended' })}
        onOpenChange={() => {}}
      />,
    )
    expect(screen.getByText('Suspend this organization?')).toBeTruthy()
    expect(screen.getByText(/Acme/)).toBeTruthy()

    rerender(
      <TenantStatusDialog
        open
        tenant={null}
        onOpenChange={() => {}}
      />,
    )
    expect(screen.getByText('Suspend this organization?')).toBeTruthy()
    expect(screen.getByText(/Acme/)).toBeTruthy()
  })
})
