// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ProfileResponse } from '#/generated/api-types'

// react-i18next 只在 h1 取 route 标题,mock 成 identity,免拉整套 i18n。
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

// 三个 api hook 全 mock:数据/挂起态由测试控制,不触真网络。
const h = vi.hoisted(() => ({
  mutateUpdate: vi.fn(),
  mutateUpload: vi.fn(),
  state: { profile: null as ProfileResponse | null, uploadPending: false },
}))

vi.mock('@/api/profile', () => ({
  profileQueryOptions: {},
  useMyProfile: () => ({ data: h.state.profile }),
  useUpdateProfile: () => ({
    error: null,
    isError: false,
    isSuccess: false,
    mutateAsync: h.mutateUpdate,
  }),
  useUploadAvatar: () => ({ isPending: h.state.uploadPending, mutateAsync: h.mutateUpload }),
}))

import { ProfilePage } from './-profile-page'

function fakeProfile(overrides: Partial<ProfileResponse> = {}): ProfileResponse {
  return {
    avatar_content_id: 'c0',
    created_at: '2026-01-01T00:00:00Z',
    display_name: 'Old Name',
    phone: 'p0',
    updated_at: '2026-01-01T00:00:00Z',
    user_id: 'u1',
    ...overrides,
  }
}

beforeEach(() => {
  h.state.profile = fakeProfile()
  h.state.uploadPending = false
  h.mutateUpdate.mockReset().mockResolvedValue(fakeProfile())
  h.mutateUpload.mockReset()
})

afterEach(() => {
  cleanup()
})

describe('ProfilePage', () => {
  it('seeds the form fields from the loaded profile', () => {
    render(<ProfilePage />)
    expect((screen.getByLabelText('Display name') as HTMLInputElement).value).toBe('Old Name')
    expect((screen.getByLabelText('Phone') as HTMLInputElement).value).toBe('p0')
  })

  it('disables Save while an avatar upload is in flight (no stale-id save)', () => {
    h.state.uploadPending = true
    render(<ProfilePage />)
    expect(
      (screen.getByRole('button', { name: 'Save changes' }) as HTMLButtonElement).disabled,
    ).toBe(true)
  })

  it('submits a full-replace body, carrying avatar_content_id and clearing emptied fields', async () => {
    render(<ProfilePage />)

    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'New Name' } })
    fireEvent.change(screen.getByLabelText('Phone'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(h.mutateUpdate).toHaveBeenCalledTimes(1))
    expect(h.mutateUpdate).toHaveBeenCalledWith({
      userId: 'u1',
      // 全量:文本改动 + 空 phone → null(清空),头像 id 原样带过(未改也不丢)。
      request: { avatar_content_id: 'c0', display_name: 'New Name', phone: null },
    })
  })
})
