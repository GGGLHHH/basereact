// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ContentResponse, ObjectResponse } from '#/generated/api-types'

import {
  confirmUpload,
  deleteContent,
  prepareUpload,
  updateContent,
  uploadContent,
} from '#/generated/client'

import { uploadContentFlow } from './use-content-upload'

vi.mock('#/generated/client', () => ({
  confirmUpload: vi.fn(),
  deleteContent: vi.fn(),
  prepareUpload: vi.fn(),
  updateContent: vi.fn(),
  uploadContent: vi.fn(),
}))

// 全必填字段的 fixture,不用 as never:codegen 响应类型变更时编译器能抓到过期 mock。
function fakeContent(id: string, overrides: Partial<ContentResponse> = {}): ContentResponse {
  return {
    created_at: '2026-01-01T00:00:00Z',
    id,
    owner_id: 'user-1',
    status: 'created',
    tenant_id: 'tenant-1',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function fakeObject(id: string): ObjectResponse {
  return {
    content_id: 'c1',
    created_at: '2026-01-01T00:00:00Z',
    id,
    object_key: `objects/${id}`,
    status: 'created',
    storage_backend_name: 'minio',
    updated_at: '2026-01-01T00:00:00Z',
    version: 1,
  }
}

const file = new File(['hello'], 'hello.txt', { type: 'text/plain' })

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe('uploadContentFlow', () => {
  it('runs prepare → direct PUT → confirm when upload_url is present', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue({ ok: true } as unknown as Response)
    vi.mocked(prepareUpload).mockResolvedValue({
      content: fakeContent('c1'),
      object: fakeObject('o1'),
      upload_url: 'https://bucket.example/put',
    })
    vi.mocked(confirmUpload).mockResolvedValue(fakeContent('c1', { status: 'uploaded' }))

    const phases: string[] = []
    const result = await uploadContentFlow({
      file,
      onProgress: (phase) => phases.push(phase),
      request: { name: 'Hello' },
    })

    expect(prepareUpload).toHaveBeenCalledWith({
      body: { file_name: 'hello.txt', mime_type: 'text/plain', name: 'Hello' },
    })
    expect(fetchMock).toHaveBeenCalledWith('https://bucket.example/put', {
      body: file,
      headers: { 'Content-Type': 'text/plain' },
      method: 'PUT',
    })
    expect(confirmUpload).toHaveBeenCalledWith({ path: { id: 'c1' } })
    expect(uploadContent).not.toHaveBeenCalled()
    expect(deleteContent).not.toHaveBeenCalled()
    expect(phases).toEqual(['preparing', 'uploading', 'confirming', 'done'])
    expect(result).toEqual(fakeContent('c1', { status: 'uploaded' }))
  })

  it('falls back to one-step multipart and cleans up the prepared row when upload_url is null', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    vi.mocked(prepareUpload).mockResolvedValue({
      content: fakeContent('c1'),
      object: fakeObject('o1'),
      upload_url: null,
    })
    vi.mocked(uploadContent).mockResolvedValue({
      content: fakeContent('c2', { status: 'uploaded' }),
      object: fakeObject('o2'),
    })
    vi.mocked(deleteContent).mockResolvedValue(undefined)

    const phases: string[] = []
    const result = await uploadContentFlow({
      file,
      onProgress: (phase) => phases.push(phase),
      request: { name: 'Hello', tags: ['a', 'b'] },
    })

    expect(fetchMock).not.toHaveBeenCalled()
    expect(confirmUpload).not.toHaveBeenCalled()
    const form = vi.mocked(uploadContent).mock.calls[0]?.[0].body as FormData
    const filePart = form.get('file') as File
    expect(filePart.name).toBe('hello.txt')
    expect(filePart.type).toBe('text/plain')
    expect(form.get('name')).toBe('Hello')
    expect(form.get('tags')).toBe('a,b')
    // 表单带不了 description/owner_type,没传就不该发补丁请求
    expect(updateContent).not.toHaveBeenCalled()
    // prepare 建的孤儿账要清掉
    expect(deleteContent).toHaveBeenCalledWith({ path: { id: 'c1' } })
    expect(phases).toEqual(['preparing', 'uploading', 'done'])
    expect(result).toEqual(fakeContent('c2', { status: 'uploaded' }))
  })

  it('patches multipart-unsupported fields and carries the declared mime on fallback', async () => {
    const typelessFile = new File(['# hi'], 'report.md')
    vi.mocked(prepareUpload).mockResolvedValue({
      content: fakeContent('c1'),
      object: fakeObject('o1'),
      upload_url: null,
    })
    vi.mocked(uploadContent).mockResolvedValue({
      content: fakeContent('c2', { name: 'report.md', status: 'uploaded' }),
      object: fakeObject('o2'),
    })
    vi.mocked(updateContent).mockResolvedValue(
      fakeContent('c2', { description: 'quarterly', name: 'report.md', status: 'uploaded' }),
    )
    vi.mocked(deleteContent).mockResolvedValue(undefined)

    const result = await uploadContentFlow({
      file: typelessFile,
      request: { description: 'quarterly', mime_type: 'text/markdown' },
    })

    expect(prepareUpload).toHaveBeenCalledWith({
      body: { description: 'quarterly', file_name: 'report.md', mime_type: 'text/markdown' },
    })
    const form = vi.mocked(uploadContent).mock.calls[0]?.[0].body as FormData
    // file.type 为空时 part 的 mime 必须来自申报值,两条路径落库一致
    expect((form.get('file') as File).type).toBe('text/markdown')
    expect(updateContent).toHaveBeenCalledWith({
      body: {
        description: 'quarterly',
        document_type: undefined,
        name: 'report.md',
        owner_type: undefined,
      },
      path: { id: 'c2' },
    })
    expect(result.description).toBe('quarterly')
  })

  it('still succeeds when orphan cleanup is not permitted', async () => {
    vi.mocked(prepareUpload).mockResolvedValue({
      content: fakeContent('c1'),
      object: fakeObject('o1'),
      upload_url: null,
    })
    vi.mocked(uploadContent).mockResolvedValue({
      content: fakeContent('c2', { status: 'uploaded' }),
      object: fakeObject('o2'),
    })
    vi.mocked(deleteContent).mockRejectedValue(new Error('403'))

    const result = await uploadContentFlow({ file })

    expect(result.id).toBe('c2')
  })

  it('does not confirm when the direct PUT fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 403,
    } as unknown as Response)
    vi.mocked(prepareUpload).mockResolvedValue({
      content: fakeContent('c1'),
      object: fakeObject('o1'),
      upload_url: 'https://bucket.example/put',
    })

    await expect(uploadContentFlow({ file })).rejects.toThrow('Upload failed with status 403')
    expect(confirmUpload).not.toHaveBeenCalled()
  })
})
