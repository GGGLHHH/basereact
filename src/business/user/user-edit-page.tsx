import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import type { AdminUserView } from '#/generated/api-types'

import { useUser } from '@/api/users'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/datetime'

import { AccountSection } from './edit/account-section'
import { PasswordSection } from './edit/password-section'
import { ProfileSection } from './edit/profile-section'
import { RolesSection } from './edit/roles-section'
import { EditSectionCard } from './edit/section-card'

// 分区式编辑:每区 = 一个后端端点,各自独立保存,失败互不牵连。
// username/email → updateUser;roles → setUserRoles;password → resetUserPassword;
// 头像/display_name/phone → putProfile(需 profiles:write,无权限则整区不出现)。
export function UserEditPage({ userId }: { userId: string }) {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const { data: user } = useUser(userId)

  // loader 已 ensure,首帧即有;冷进兜底不渲染。
  if (!user) {
    return null
  }

  return (
    <div className='mx-auto flex w-full max-w-2xl flex-col gap-6'>
      <div className='flex items-start justify-between gap-4'>
        <div className='flex flex-col gap-1'>
          <h1 className='text-lg font-medium'>{user.username}</h1>
          <p className='text-sm text-muted-foreground'>{t('users.edit.description')}</p>
        </div>
        <Button
          onClick={() => {
            void navigate({ params: { userId }, to: '/admin/users/$userId' })
          }}
          variant='outline'
        >
          {t('action.goBack')}
        </Button>
      </div>

      <AccountSection user={user} />
      <RolesSection user={user} />
      <PasswordSection userId={userId} />
      {/* 资料/头像已纳入 users:admin(整页即 users:admin 门),故恒显示。 */}
      <ProfileSection userId={userId} />
      <MetaSection user={user} />
    </div>
  )
}

// 只读系统字段:id / created_at / email_verified —— 无写入端点,原样展示。
function MetaSection({ user }: { user: AdminUserView }) {
  const { t } = useTranslation('common')

  return (
    <EditSectionCard title={t('users.edit.metaTitle')}>
      <dl className='grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-[10rem_1fr]'>
        <div className='grid grid-cols-subgrid sm:col-span-2'>
          <dt className='text-muted-foreground'>{t('users.columns.id')}</dt>
          <dd className='font-mono text-xs wrap-break-word'>{user.id}</dd>
        </div>
        <div className='grid grid-cols-subgrid sm:col-span-2'>
          <dt className='text-muted-foreground'>{t('users.columns.createdAt')}</dt>
          <dd>{formatDateTime(user.created_at)}</dd>
        </div>
        <div className='grid grid-cols-subgrid sm:col-span-2'>
          <dt className='text-muted-foreground'>{t('users.columns.emailVerified')}</dt>
          <dd>
            <Badge variant={user.email_verified ? 'default' : 'secondary'}>
              <span
                aria-hidden
                className={user.email_verified ? 'i-lucide-check size-3' : 'i-lucide-x size-3'}
              />
              {String(user.email_verified)}
            </Badge>
          </dd>
        </div>
      </dl>
    </EditSectionCard>
  )
}
