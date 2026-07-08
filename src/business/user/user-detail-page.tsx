import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useUser } from '@/api/users'
import { dash } from '@/business/common'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime } from '@/lib/datetime'

import { DeleteUserDialog } from './delete-user-dialog'

export function UserDetailPage({ userId }: { userId: string }) {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const { data: user } = useUser(userId)
  const [deleteOpen, setDeleteOpen] = useState(false)

  // loader 已 ensure;冷进兜底不渲染(404 由路由 errorComponent 接)。
  if (!user) {
    return null
  }

  const rows: [string, string][] = [
    [t('users.columns.id'), user.id],
    [t('users.columns.username'), user.username],
    [t('users.columns.email'), dash(user.email)],
    [t('users.columns.displayName'), dash(user.display_name)],
    [t('users.columns.roles'), user.roles.join(', ') || '—'],
    [t('users.columns.emailVerified'), String(user.email_verified)],
    [t('users.columns.createdAt'), formatDateTime(user.created_at)],
  ]

  return (
    <Card className='mx-auto w-full max-w-2xl'>
      <CardHeader>
        <CardTitle>{user.username}</CardTitle>
        <CardDescription>{t('users.detail.title')}</CardDescription>
      </CardHeader>
      <CardContent className='flex flex-col gap-6'>
        <dl className='grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-[10rem_1fr]'>
          {rows.map(([label, value]) => (
            <div
              key={label}
              className='grid grid-cols-subgrid sm:col-span-2'
            >
              <dt className='text-muted-foreground'>{label}</dt>
              <dd className='wrap-break-word'>{value}</dd>
            </div>
          ))}
        </dl>
        <div className='flex justify-end gap-2'>
          <Button
            onClick={() => {
              void navigate({ to: '/admin/users' })
            }}
            variant='outline'
          >
            {t('action.goBack')}
          </Button>
          <Button
            onClick={() => {
              void navigate({ params: { userId }, to: '/admin/users/$userId/edit' })
            }}
            variant='outline'
          >
            {t('action.edit')}
          </Button>
          <Button
            onClick={() => setDeleteOpen(true)}
            variant='destructive'
          >
            {t('action.delete')}
          </Button>
        </div>
      </CardContent>
      <DeleteUserDialog
        open={deleteOpen}
        user={user}
        onDeleted={() => {
          void navigate({ to: '/admin/users' })
        }}
        onOpenChange={setDeleteOpen}
      />
    </Card>
  )
}
