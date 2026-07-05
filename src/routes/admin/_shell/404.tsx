import { createFileRoute } from '@tanstack/react-router'

import { ErrorState } from '@/components/error-state'

export const Route = createFileRoute('/admin/_shell/404')({
  component: ShellNotFoundPage,
  staticData: {
    titleKey: 'notFound',
  },
})

function ShellNotFoundPage() {
  return (
    <ErrorState
      className='flex-1'
      homeTo='/admin/home'
      code='404'
      title='Page not found'
      description='The page you are looking for does not exist.'
    />
  )
}
