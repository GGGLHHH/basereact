// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ProfileResponse } from '#/generated/api-types'

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const h = vi.hoisted(() => ({
  profile: null as ProfileResponse | null,
  loading: false,
  error: null as { status?: number } | null,
  refetch: vi.fn(),
  update: vi.fn(),
  upload: vi.fn(),
}))
vi.mock('@/api/profile', () => ({
  useUserProfile: () => ({
    data: h.profile,
    error: h.error,
    isError: h.error != null,
    isLoading: h.loading,
    refetch: h.refetch,
  }),
  useUpdateUserProfile: () => ({ isPending: false, mutateAsync: h.update }),
  useUploadUserAvatar: () => ({ isPending: false, mutateAsync: h.upload }),
}))

import { ProfileSection } from './profile-section'

function fakeProfile(overrides: Partial<ProfileResponse> = {}): ProfileResponse {
  return {
    avatar_content_id: 'c0',
    avatar_url: '/api/v1/frontend/contents/c0/preview',
    created_at: '2026-01-01T00:00:00Z',
    display_name: 'Ada Lovelace',
    phone: '123',
    updated_at: '2026-01-01T00:00:00Z',
    user_id: 'u1',
    ...overrides,
  }
}

beforeEach(() => {
  h.profile = fakeProfile()
  h.loading = false
  h.error = null
  h.refetch.mockReset()
  h.update.mockReset().mockResolvedValue(fakeProfile())
  // auto-bind:上传返回更新后的 ProfileResponse(不再是 ContentResponse)。
  h.upload.mockReset().mockResolvedValue(fakeProfile({ avatar_content_id: 'c9' }))
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('ProfileSection', () => {
  it('seeds display name and phone from the loaded profile', () => {
    render(<ProfileSection userId='u1' />)
    expect((screen.getByLabelText('Display name') as HTMLInputElement).value).toBe('Ada Lovelace')
    expect((screen.getByLabelText('Phone') as HTMLInputElement).value).toBe('123')
  })

  it('saves a full-replace PutProfileRequest carrying the current avatar id, clearing emptied fields', async () => {
    render(<ProfileSection userId='u1' />)

    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'New Name' } })
    fireEvent.change(screen.getByLabelText('Phone'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(h.update).toHaveBeenCalledWith({
        request: { avatar_content_id: 'c0', display_name: 'New Name', phone: null },
        userId: 'u1',
      }),
    )
  })

  it('renders an empty editable form for a 404 (user has no profile row yet)', () => {
    h.profile = null
    h.error = { status: 404 }
    render(<ProfileSection userId='u1' />)
    expect((screen.getByLabelText('Display name') as HTMLInputElement).value).toBe('')
  })

  it('shows a retry error state (never an empty form) when load fails non-404, so Save cannot wipe the profile', () => {
    h.profile = null
    h.error = { status: 500 }
    render(<ProfileSection userId='u1' />)
    // No editable form (a Save here would PUT-clear the real profile) — offer retry instead.
    expect(screen.queryByLabelText('Display name')).toBeNull()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy()
  })

  it('revokes the avatar object URL on unmount (no blob leak)', async () => {
    const revoke = vi.fn<(url: string) => void>()
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:avatar', revokeObjectURL: revoke })
    h.upload.mockResolvedValue(fakeProfile({ avatar_content_id: 'c9' }))

    const { container, unmount } = render(<ProfileSection userId='u1' />)
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(fileInput, {
      target: { files: [new File(['x'], 'a.png', { type: 'image/png' })] },
    })

    await waitFor(() => expect(h.upload).toHaveBeenCalledTimes(1))
    unmount()
    expect(revoke).toHaveBeenCalledWith('blob:avatar')
  })
})
