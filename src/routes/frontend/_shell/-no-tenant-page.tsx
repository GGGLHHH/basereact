import { LinkButton, Spinner } from '@gedatou/cadenza-ui'
import { Link, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { NoTenantView } from '@/components/no-tenant-state'

export function NoTenantPending() {
  return (
    <div className='flex flex-1 items-center justify-center'>
      <Spinner className='size-6' />
    </div>
  )
}

// 公开站的「没有当前组织」:在顶部导航壳里(登出按钮就在顶栏)。属于组织 → 列出来选一个进入
// (只属于 1 个组织时顶栏没有切换器,这里是唯一入口);一个都没有 → 「还没加入任何组织」。
// 两种状态都给回首页的出口。
export function FrontendNoTenantPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <div className='flex flex-1 items-center justify-center'>
      <NoTenantView onEntered={() => void navigate({ to: '/frontend/home' })}>
        <LinkButton render={<Link to='/frontend/home' />}>{t('action.home')}</LinkButton>
      </NoTenantView>
    </div>
  )
}
