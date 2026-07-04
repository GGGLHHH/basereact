// Runtime contract for vite-plugin-openapi-codegen generated clients.
// Trimmed from xchangeai-web's api-client: same ky setup and error
// normalization, minus auth refresh / i18n / toast — port those back
// from xchangeai-web when this app grows auth.

import ky, { isNetworkError, isTimeoutError } from 'ky'

import type { Options as KyOptions } from 'ky'
import type { ErrorBody } from '#/generated/api-types'

const API_BASE_URL = '/api/v1'

export type ApiRequestOptions = KyOptions & {
  contentType?: string
}

export type ApiErrorKind = 'abort' | 'http' | 'network' | 'timeout'

export class ApiErrorClass extends Error {
  /** Machine-readable category from ErrorBody.code, e.g. not_found / validation / unauthorized */
  code?: string
  kind: ApiErrorKind
  status?: number

  constructor(
    message: string,
    options?: {
      code?: string
      kind?: ApiErrorKind
      status?: number
    },
  ) {
    super(message)
    this.name = 'ApiError'
    this.code = options?.code
    this.kind = options?.kind ?? 'http'
    this.status = options?.status

    Object.setPrototypeOf(this, ApiErrorClass.prototype)
  }
}

export const api = ky.create({
  credentials: 'include',
  hooks: {
    afterResponse: [
      async ({ response }) => {
        if (!response.ok) {
          throw await createApiError(response)
        }
        return response
      },
    ],
  },
  prefix: API_BASE_URL,
  retry: {
    limit: 1,
    shouldRetry: () => false,
  },
  timeout: 300000, // 5 minutes
})

export async function requestJson<T>(path: string, options: ApiRequestOptions): Promise<T> {
  try {
    return await api(path, options).json<T>()
  } catch (error) {
    throw createClientError(error)
  }
}

export async function requestVoid(path: string, options: ApiRequestOptions): Promise<void> {
  try {
    await api(path, options)
  } catch (error) {
    throw createClientError(error)
  }
}

async function createApiError(response: Response): Promise<ApiErrorClass> {
  let errorMessage = `Request failed (${response.status})`
  let errorCode: string | undefined

  try {
    // Backend's unified error contract; codegen keeps this in sync with the spec.
    const errorData = (await response.clone().json()) as Partial<ErrorBody>
    errorMessage = errorData.error || errorMessage
    errorCode = errorData.code
  } catch {
    errorMessage = response.statusText || errorMessage
  }

  return new ApiErrorClass(errorMessage, {
    code: errorCode,
    kind: 'http',
    status: response.status,
  })
}

function createClientError(error: unknown): ApiErrorClass {
  if (error instanceof ApiErrorClass) {
    return error
  }

  if (isTimeoutError(error)) {
    return new ApiErrorClass('The request timed out. Please try again.', {
      kind: 'timeout',
    })
  }

  if (isAbortError(error)) {
    return new ApiErrorClass('The request was canceled.', {
      kind: 'abort',
    })
  }

  if (isNetworkError(error)) {
    return new ApiErrorClass('Unable to reach the server. Check your connection and try again.', {
      kind: 'network',
    })
  }

  return new ApiErrorClass('Request failed. Please try again.', {
    kind: 'network',
  })
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === 'AbortError'
    : error instanceof Error && error.name === 'AbortError'
}
