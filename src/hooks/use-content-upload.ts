import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import type { ContentResponse, PrepareUploadRequest } from '#/generated/api-types'

import {
  confirmUpload,
  deleteContent,
  prepareUpload,
  updateContent,
  uploadContent,
} from '#/generated/client'
import i18next from 'i18next'

import { queryKeys } from '#/lib/query-keys'

export type ContentUploadPhase =
  | 'confirming'
  | 'done'
  | 'error'
  | 'idle'
  | 'preparing'
  | 'uploading'

export interface ContentUploadInput {
  file: File
  onProgress?: (phase: ContentUploadPhase) => void
  request?: Partial<Omit<PrepareUploadRequest, 'file_name'>>
}

async function putUploadFile(uploadUrl: string, file: File, contentType: string): Promise<void> {
  const response = await fetch(uploadUrl, {
    body: file,
    headers: {
      'Content-Type': contentType,
    },
    method: 'PUT',
  })

  if (!response.ok) {
    throw new Error(i18next.t('upload.failedWithStatus', { status: response.status }))
  }
}

// 一步上传的表单字段(openapi:file 必填,其余可选)。tags 逗号分隔 —— 含逗号的
// tag 会被后端拆开,直传路径(JSON 数组)无此问题,属 multipart 合同限制。
function buildMultipartForm(
  file: File,
  request: ContentUploadInput['request'],
  contentType: string,
): FormData {
  const form = new FormData()
  // file part 的 content-type 是回退路径唯一的 mime 通道:file.type 可能为空
  // (.md/无扩展名),必须带上申报的 contentType,否则与直传路径落库 mime 不一致。
  form.append('file', new File([file], file.name, { type: contentType }), file.name)
  if (request?.name != null) form.append('name', request.name)
  if (request?.tags?.length) form.append('tags', request.tags.join(','))
  if (request?.document_type != null) form.append('document_type', request.document_type)
  return form
}

export async function uploadContentFlow(input: ContentUploadInput): Promise<ContentResponse> {
  // prepare 里申报的 mime 必须和直传 PUT 的 Content-Type 一致(预签名校验)。
  const contentType = input.request?.mime_type || input.file.type || 'application/octet-stream'

  input.onProgress?.('preparing')
  const prepared = await prepareUpload({
    body: {
      ...input.request,
      file_name: input.file.name,
      mime_type: contentType,
    },
  })

  // upload_url = null:后端不支持直传,按 openapi 注释回退 multipart 一步上传。
  if (!prepared.upload_url) {
    input.onProgress?.('uploading')
    const uploaded = await uploadContent({
      body: buildMultipartForm(input.file, input.request, contentType),
    })

    // multipart 表单带不了 description/owner_type,补到新建的 content 上。
    // PUT 全量替换:以现值为底,只覆盖缺失字段,避免把后端已推导的 name 置空。
    let content = uploaded.content
    if (input.request?.description != null || input.request?.owner_type != null) {
      content = await updateContent({
        body: {
          description: input.request.description ?? uploaded.content.description,
          document_type: uploaded.content.document_type,
          name: uploaded.content.name,
          owner_type: input.request.owner_type ?? uploaded.content.owner_type,
        },
        path: { id: uploaded.content.id },
      })
    }

    // prepare 建的账被 multipart 新建的 content 取代,清掉孤儿行。
    // best-effort:失败(如无 contents:delete 权限)不影响上传结果。
    await deleteContent({ path: { id: prepared.content.id } }).catch(() => {})

    input.onProgress?.('done')
    return content
  }

  input.onProgress?.('uploading')
  await putUploadFile(prepared.upload_url, input.file, contentType)

  input.onProgress?.('confirming')
  // ponytail: confirm 幂等(后端注明重试安全),但 mutation 级重试会整个 flow
  // 重跑(重新建账 + 重传字节);断点恢复需把 content id 状态外提,等有真实需求再做。
  const content = await confirmUpload({ path: { id: prepared.content.id } })
  input.onProgress?.('done')
  return content
}

export function useContentUpload() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: uploadContentFlow,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.contents.all })
    },
  })
}

const UPLOAD_PROGRESS_PHASE_RANGES: Record<ContentUploadPhase, { max: number; start: number }> = {
  confirming: { max: 98, start: 80 },
  done: { max: 100, start: 100 },
  error: { max: 0, start: 0 },
  idle: { max: 0, start: 0 },
  preparing: { max: 15, start: 8 },
  uploading: { max: 80, start: 15 },
}

export function useSimulatedUploadProgress(phase: ContentUploadPhase): number {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const range = UPLOAD_PROGRESS_PHASE_RANGES[phase]
    setProgress(range.start)

    if (range.start >= range.max) {
      return
    }

    const timer = window.setInterval(() => {
      setProgress((current) => {
        if (current >= range.max) {
          return range.max
        }

        return Math.min(current + Math.max(1, Math.round((range.max - current) * 0.18)), range.max)
      })
    }, 300)

    return () => {
      window.clearInterval(timer)
    }
  }, [phase])

  return progress
}
