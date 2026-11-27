import type { AdminUserView } from '@/generated/api-types'
import { Button } from '@gedatou/cadenza-ui'
import { useRouter } from '@tanstack/react-router'

import { useTranslation } from 'react-i18next'

import { useUser } from '@/api/users'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatDateTime } from '@/lib/datetime'
import { nameInitials } from '@/lib/display-name'
import { useMyPermissions } from '@/lib/use-access-policy'

import { AccountSection } from './edit/account-section'
import { PasswordSection } from './edit/password-section'
import { ProfileSection } from './edit/profile-section'
import { RolesSection } from './edit/roles-section'
import { EditSectionCard } from './edit/section-card'
import { canManageAccount, rolesEditable } from './roles'
import { AccountStamp, FieldRow, VerifiedBadge } from './user-badges'

// 分区式编辑:每区 = 一个后端端点,各自独立保存,失败互不牵连。
// username/email → updateUser;roles → setUserRoles;password → resetUserPassword;
// 头像/display_name/phone → setUserProfile / 头像上传(都在 users:admin 之下,整页同一个门)。
export function UserEditPage({ userId }: { userId: string }) {
  const { t } = useTranslation('common')
  const router = useRouter()
  const { data: user } = useUser(userId)
  const permissions = useMyPermissions()

  // loader 已 ensure,首帧即有;冷进兜底不渲染。
  if (!user) {
    return null
  }
  // 持平台角色的账号(superadmin / 平台管理员)只有 platform:roles 能改:其余操作者只看到说明,
  // 不渲染任何可保存的分区(直连 URL 也一样;后端兜底 403)。
  const manageable = canManageAccount(user, permissions)

  return (
    <div className='mx-auto flex w-full max-w-2xl flex-col gap-6'>
      {/* 身份头:与详情页同一套凭证语言(头像 + 名 + 验证章 + 账号编号戳)。 */}
      <div className='flex items-start justify-between gap-4'>
        <div className='flex min-w-0 items-start gap-3'>
          <Avatar
            className='size-12'
            size='lg'
          >
            <AvatarImage
              alt={user.display_name ?? user.username}
              src={user.avatar_url ?? undefined}
            />
            <AvatarFallback>{nameInitials((user.display_name ?? '') || user.username)}</AvatarFallback>
          </Avatar>
          <div className='flex min-w-0 flex-col gap-1'>
            <div className='flex flex-wrap items-center gap-2'>
              <h1 className='truncate text-lg font-semibold'>{user.username}</h1>
              <VerifiedBadge verified={user.email_verified} />
            </div>
            <AccountStamp
              id={user.id}
              label={t('users.detail.account')}
            />
          </div>
        </div>
        <Button
          className='shrink-0'
          onClick={() => router.history.back()}
          variant='outline'
        >
          {t('action.goBack')}
        </Button>
      </div>

      {manageable
        ? (
            <>
              <AccountSection user={user} />
              {rolesEditable(user)
                ? <RolesSection user={user} />
                : (
                    <EditSectionCard title={t('users.edit.rolesTitle')}>
                      <p className='text-sm text-muted-foreground'>{t('users.edit.rolesFixed')}</p>
                    </EditSectionCard>
                  )}
              <PasswordSection userId={userId} />
              {/* 资料/头像已纳入 users:admin(整页即 users:admin 门),故恒显示。 */}
              <ProfileSection userId={userId} />
            </>
          )
        : (
            <p
              className='rounded-md border border-border p-4 text-sm text-muted-foreground'
              role='note'
            >
              {t('users.edit.protected')}
            </p>
          )}
      <MetaSection user={user} />
    </div>
  )
}

// 只读系统字段(id / created_at)—— 无写入端点。验证章在身份头,这里只留可复制的引用。
function MetaSection({ user }: { user: AdminUserView }) {
  const { t } = useTranslation('common')

  return (
    <EditSectionCard title={t('users.edit.metaTitle')}>
      <dl className='grid gap-4 sm:grid-cols-2'>
        <FieldRow
          label={t('users.columns.createdAt')}
          value={formatDateTime(user.created_at)}
        />
        <FieldRow
          label={t('users.columns.id')}
          value={<span className='font-mono text-xs'>{user.id}</span>}
        />
      </dl>
    </EditSectionCard>
  )
}
