import { createFileRoute } from '@tanstack/react-router'

import { ErrorState } from '@/components/error-state'

export const Route = createFileRoute('/admin/_shell/403')({
  component: ShellForbiddenPage,
  staticData: {
    titleKey: 'forbidden',
  },
})

function ShellForbiddenPage() {
  return (
    <ErrorState
      className='flex-1'
      homeTo='/admin/home'
      code='403'
      title='Access denied'
      description='You do not have permission to view this page.'
    />
  )
}
