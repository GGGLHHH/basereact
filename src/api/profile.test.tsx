// @vitest-environment happy-dom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ReactNode } from 'react'
import type { ContentResponse, ProfileResponse } from '#/generated/api-types'

import { getMyProfile, putProfile } from '#/generated/client'
import { uploadContentFlow } from '#/hooks/use-content-upload'
import { queryKeys } from '#/lib/query-keys'

import { profileQueryOptions, useMyProfile, useUpdateProfile, useUploadAvatar } from './profile'

vi.mock('#/generated/client', () => ({
  getMyProfile: vi.fn(),
  putProfile: vi.fn(),
}))

vi.mock('#/hooks/use-content-upload', () => ({
  uploadContentFlow: vi.fn(),
}))

// 全必填字段 fixture(created_at/updated_at/user_id),codegen 类型变更时编译期抓过期 mock。
function fakeProfile(overrides: Partial<ProfileResponse> = {}): ProfileResponse {
  return {
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    user_id: 'u1',
    ...overrides,
  }
}

function makeClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })
}

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('profileQueryOptions', () => {
  it('reads GET /profiles/me under the profile.me key', async () => {
    vi.mocked(getMyProfile).mockResolvedValue(fakeProfile({ display_name: 'Jane Doe' }))
    expect(profileQueryOptions.queryKey).toEqual(queryKeys.profile.me())

    const client = makeClient()
    const { result } = renderHook(() => useMyProfile(), { wrapper: wrapper(client) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getMyProfile).toHaveBeenCalledWith({})
    expect(result.current.data?.display_name).toBe('Jane Doe')
    expect(client.getQueryData(queryKeys.profile.me())).toMatchObject({ display_name: 'Jane Doe' })
  })
})

describe('useUpdateProfile', () => {
  it('PUTs a full-replace body to /profiles/{user_id} and seeds the profile.me cache', async () => {
    const updated = fakeProfile({ avatar_content_id: 'c9', display_name: 'New Name', phone: '123' })
    vi.mocked(putProfile).mockResolvedValue(updated)

    const client = makeClient()
    const { result } = renderHook(() => useUpdateProfile(), { wrapper: wrapper(client) })

    await result.current.mutateAsync({
      userId: 'u1',
      request: { avatar_content_id: 'c9', display_name: 'New Name', phone: '123' },
    })

    expect(putProfile).toHaveBeenCalledWith({
      body: { avatar_content_id: 'c9', display_name: 'New Name', phone: '123' },
      path: { user_id: 'u1' },
    })
    // onSuccess 种缓存:侧边栏 NavUser 与页面共读 profile.me,存后即刷。
    expect(client.getQueryData(queryKeys.profile.me())).toEqual(updated)
  })

  it('forwards a cleared (null) field as-is (PUT clears, not skips)', async () => {
    vi.mocked(putProfile).mockResolvedValue(fakeProfile())

    const client = makeClient()
    const { result } = renderHook(() => useUpdateProfile(), { wrapper: wrapper(client) })

    await result.current.mutateAsync({
      userId: 'u1',
      request: { avatar_content_id: null, display_name: null, phone: null },
    })

    expect(putProfile).toHaveBeenCalledWith({
      body: { avatar_content_id: null, display_name: null, phone: null },
      path: { user_id: 'u1' },
    })
  })
})

describe('useUploadAvatar', () => {
  it('delegates to uploadContentFlow with the picked file and returns its confirmed content', async () => {
    const content = { id: 'c1' } as ContentResponse
    vi.mocked(uploadContentFlow).mockResolvedValue(content)

    const client = makeClient()
    const { result } = renderHook(() => useUploadAvatar(), { wrapper: wrapper(client) })

    const file = new File(['x'], 'a.png', { type: 'image/png' })
    const out = await result.current.mutateAsync(file)

    expect(uploadContentFlow).toHaveBeenCalledWith({ file })
    expect(out).toBe(content)
  })
})
