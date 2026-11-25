import type { ErrorComponentProps } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { ErrorState } from '@/components/error-state'
import { ApiErrorClass } from '@/lib/api-client'
import { reportClientError } from '@/lib/error-reporting'

// 从 router.tsx 拆出来:那个文件导出的 getRouter 是非组件,组件和它同住会拦住
// Fast Refresh(react-refresh/only-export-components)。
export function RouterError({ error }: ErrorComponentProps) {
  const { t } = useTranslation()
  useEffect(() => {
    // 接口错误后端自己有记录(5xx 进日志、网络错误不是代码问题),这里只报前端代码本身的错。
    // SSR 传到客户端的错误会还原成普通 Error(自定义子类丢了,name 还在),所以也按 name 认。
    const isApiError = error instanceof ApiErrorClass || (error instanceof Error && error.name === 'ApiError')
    if (!isApiError)
      reportClientError('render', error)
  }, [error])
  return (
    <ErrorState
      className='min-h-svh'
      code='Error'
      title={t('errors.generic')}
      description={error instanceof Error ? error.message : String(error)}
    />
  )
}
