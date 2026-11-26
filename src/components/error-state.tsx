import type { LinkProps } from '@tanstack/react-router'
import { Button, LinkButton } from '@gedatou/cadenza-ui'
import { Link, useNavigate, useRouter } from '@tanstack/react-router'

import { useTranslation } from 'react-i18next'

import { TenantMenu } from '@/components/team-switcher'
import { cn } from '@/lib/utils'

interface ErrorStateProps {
  className?: string
  code: string
  description: string
  /** Home 按钮去向;admin 壳内的错误页传 /admin/home,默认站点首页。注册路由表强类型,写错路径编译期报。 */
  homeTo?: LinkProps['to']
  title: string
}

export function ErrorState({ className, code, description, homeTo = '/', title }: ErrorStateProps) {
  const { t } = useTranslation()
  const router = useRouter()
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 text-center', className)}>
      <p className='font-heading text-7xl font-bold text-muted-foreground/40'>{code}</p>
      <h1 className='text-xl font-semibold'>{title}</h1>
      <p className='text-sm text-muted-foreground'>{description}</p>
      <div className='mt-3 flex gap-2'>
        <Button
          variant='outline'
          onClick={() => router.history.back()}
        >
          {t('action.goBack')}
        </Button>
        <LinkButton render={<Link to={homeTo} />}>{t('action.home')}</LinkButton>
      </div>
    </div>
  )
}

// 全屏变体给独立路由(/403、/404)和根路由 notFoundComponent 用;
// 带 layout 的版本直接在 _shell 子路由里用 ErrorState + flex-1。
export function NotFoundScreen() {
  const { t } = useTranslation()
  return (
    <ErrorState
      className='min-h-svh'
      code='404'
      title={t('errors.notFound.title')}
      description={t('errors.notFound.description')}
    />
  )
}

// 全屏 403 由后台守卫(准入探针 403)带来,常见情形是刚切进一个自己没有后台权限的租户。
// 账号属于 ≥ 2 个租户时在这里给出切换器,切换成功后回后台首页重新过守卫,不至于走进死路。
// 本页可能被匿名访问,租户列表走软探测(401 不跳登录页)。
export function ForbiddenScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <div className='flex min-h-svh flex-col items-center justify-center gap-6'>
      <ErrorState
        code='403'
        title={t('errors.forbidden.title')}
        description={t('errors.forbidden.description')}
      />
      <TenantMenu
        soft
        hint={t('tenant.switcher.forbiddenHint')}
        onSwitched={() => void navigate({ to: '/admin/home' })}
      />
    </div>
  )
}
