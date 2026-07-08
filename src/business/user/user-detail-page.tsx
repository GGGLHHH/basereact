import { useNavigate, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useUser } from '@/api/users'
import { dash } from '@/business/common'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { formatDateTime } from '@/lib/datetime'
import { nameInitials } from '@/lib/display-name'

import { DeleteUserDialog } from './delete-user-dialog'
import { AccountStamp, FieldRow, RoleBadges, VerifiedBadge } from './user-badges'

export function UserDetailPage({ userId }: { userId: string }) {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const router = useRouter()
  const { data: user } = useUser(userId)
  const [deleteOpen, setDeleteOpen] = useState(false)

  // loader 已 ensure;冷进兜底不渲染(404 由路由 errorComponent 接)。
  if (!user) {
    return null
  }

  return (
    <Card className='mx-auto w-full max-w-2xl'>
      {/* 身份凭证头:头像 + 名 + 验证章 + 账号编号戳 + 角色权限 chips。 */}
      <CardHeader>
        <div className='flex items-start gap-4'>
          <Avatar
            className='size-16'
            size='lg'
          >
            <AvatarImage
              alt={user.display_name ?? user.username}
              src={user.avatar_url ?? undefined}
            />
            <AvatarFallback className='text-lg'>
              {nameInitials(user.display_name || user.username)}
            </AvatarFallback>
          </Avatar>
          <div className='flex min-w-0 flex-1 flex-col gap-1'>
            <div className='flex flex-wrap items-center gap-2'>
              <h1 className='truncate text-xl font-semibold'>{user.username}</h1>
              <VerifiedBadge verified={user.email_verified} />
            </div>
            <p className='truncate text-sm text-muted-foreground'>
              @{user.username}
              {user.display_name ? ` · ${user.display_name}` : ''}
            </p>
            <AccountStamp
              id={user.id}
              label={t('users.detail.account')}
            />
            <RoleBadges
              className='mt-1.5'
              roles={user.roles}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className='flex flex-col gap-6'>
        <dl className='grid gap-4 sm:grid-cols-2'>
          <FieldRow
            label={t('users.columns.email')}
            value={dash(user.email)}
          />
          <FieldRow
            label={t('users.columns.createdAt')}
            value={formatDateTime(user.created_at)}
          />
        </dl>

        <div className='flex justify-end gap-2 border-t border-border pt-4'>
          <Button
            onClick={() => router.history.back()}
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
