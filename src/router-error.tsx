import { useTranslation } from 'react-i18next'

import { ErrorState } from '@/components/error-state'

// 从 router.tsx 拆出来:那个文件导出的 getRouter 是非组件,组件和它同住会拦住
// Fast Refresh(react-refresh/only-export-components)。
export function RouterError({ error }: { error: Error }) {
  const { t } = useTranslation()
  return (
    <ErrorState
      className='min-h-svh'
      code='Error'
      title={t('errors.generic')}
      description={error.message}
    />
  )
}
