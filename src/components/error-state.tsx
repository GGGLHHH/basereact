import { Link } from '@tanstack/react-router'

import type { LinkProps } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'
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
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 text-center', className)}>
      <p className='font-heading text-7xl font-bold text-muted-foreground/40'>{code}</p>
      <h1 className='text-xl font-semibold'>{title}</h1>
      <p className='text-sm text-muted-foreground'>{description}</p>
      <div className='mt-3 flex gap-2'>
        <Button
          variant='outline'
          onClick={() => window.history.back()}
        >
          Go back
        </Button>
        <Button render={<Link to={homeTo} />}>Home</Button>
      </div>
    </div>
  )
}

// 全屏变体给独立路由(/403、/404)和根路由 notFoundComponent 用;
// 带 layout 的版本直接在 _shell 子路由里用 ErrorState + flex-1。
export function NotFoundScreen() {
  return (
    <ErrorState
      className='min-h-svh'
      code='404'
      title='Page not found'
      description='The page you are looking for does not exist.'
    />
  )
}

export function ForbiddenScreen() {
  return (
    <ErrorState
      className='min-h-svh'
      code='403'
      title='Access denied'
      description='You do not have permission to view this page.'
    />
  )
}
