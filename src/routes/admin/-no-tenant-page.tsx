import { Button } from '@gedatou/cadenza-ui'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { useLogout } from '@/api/auth'
import { NoTenantView } from '@/components/no-tenant-state'

// 后台的「没有当前组织」:在 _shell 之外(壳的准入探针对这种账号就是 403
// tenant_required,进不了壳)。属于组织(平台上下文里只属于 1 个时没有切换器)→ 列出来选一个进入;
// 一个都没有 → 「还没加入任何组织」,出口是登出 —— 被加进组织后重新登录即可。
// 路由是公开页(匿名访问也无害),所以列表用软探测:匿名 401 不走刷新梯、不弹登录页。
export function AdminNoTenantPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const logout = useLogout()

  function handleLogout() {
    // 登出接口失败也照样去登录页:本地会话状态已不可信(同 NavUser)。
    void logout
      .mutateAsync()
      .catch(() => undefined)
      .finally(() => void navigate({ to: '/admin/login' }))
  }

  return (
    <div className='flex min-h-svh items-center justify-center p-6'>
      <NoTenantView
        soft
        onEntered={() => void navigate({ to: '/admin/home' })}
      >
        <Button
          variant='outline'
          disabled={logout.isPending}
          onClick={handleLogout}
        >
          {t('action.logout')}
        </Button>
      </NoTenantView>
    </div>
  )
}
