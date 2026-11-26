// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiErrorClass } from '@/lib/api-client'

import { CreateTenantDialog } from './create-tenant-dialog'

const h = vi.hoisted(() => ({ mutateAsync: vi.fn() }))

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock('@/api/tenants', () => ({
  useCreateTenant: () => ({ isPending: false, mutateAsync: h.mutateAsync }),
}))

beforeEach(() => {
  h.mutateAsync.mockReset().mockResolvedValue({ id: 't9' })
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

describe('createTenantDialog', () => {
  it('creates a tenant with a trimmed name and slug', async () => {
    const onOpenChange = vi.fn<(open: boolean) => void>()
    render(
      <CreateTenantDialog
        open
        onOpenChange={onOpenChange}
      />,
    )

    fireEvent.change(screen.getByLabelText(/Name/), { target: { value: '  Acme Corp ' } })
    fireEvent.change(screen.getByLabelText(/Slug/), { target: { value: 'acme' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => expect(h.mutateAsync).toHaveBeenCalledWith({ name: 'Acme Corp', slug: 'acme' }))
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })

  it('rejects a slug the backend would refuse', async () => {
    render(
      <CreateTenantDialog
        open
        onOpenChange={() => {}}
      />,
    )

    fireEvent.change(screen.getByLabelText(/Name/), { target: { value: 'Acme' } })
    fireEvent.change(screen.getByLabelText(/Slug/), { target: { value: 'Acme Corp' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))

    expect(await screen.findByText(/lowercase letters, digits and hyphens/)).toBeTruthy()
    expect(h.mutateAsync).not.toHaveBeenCalled()
  })

  it('shows a taken slug next to the slug field (409)', async () => {
    h.mutateAsync.mockRejectedValue(new ApiErrorClass('Conflict', { code: 'conflict', status: 409 }))
    render(
      <CreateTenantDialog
        open
        onOpenChange={() => {}}
      />,
    )

    fireEvent.change(screen.getByLabelText(/Name/), { target: { value: 'Acme' } })
    fireEvent.change(screen.getByLabelText(/Slug/), { target: { value: 'acme' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))

    expect(await screen.findByText('This slug is already taken')).toBeTruthy()
  })
})
