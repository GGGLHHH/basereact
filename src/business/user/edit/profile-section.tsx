import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import type { ProfileResponse } from '#/generated/api-types'

import { useUpdateUserProfile, useUploadUserAvatar, useUserProfile } from '@/api/profile'
import { formSubmitHandler, useAppForm } from '@/components/form'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Field, FieldGroup } from '@/components/field'
import { getErrorMessage } from '@/lib/api-client'
import { nameInitials } from '@/lib/display-name'

import { EditSectionCard } from './section-card'

// 头像 + display_name + phone,整条走 admin 面(users:admin)。头像 auto-bind(上传即绑定)。
export function ProfileSection({ userId }: { userId: string }) {
  const { t } = useTranslation('common')
  const { data: profile, isLoading, isError, error, refetch } = useUserProfile(userId)

  // 只有 404 才是"该用户尚无资料行"——空表单照样 PUT(后端 upsert)。其它错误
  // (500/403/断网)绝不能渲染空表单:PUT 全量替换会把真实资料清空(数据丢失),
  // 改渲染重试态。
  const notFound = isError && error?.status === 404

  return (
    <EditSectionCard
      description={t('users.edit.profileDescription')}
      title={t('users.edit.profileTitle')}
    >
      {isLoading ? (
        <div className='flex justify-center py-6'>
          <Spinner className='size-6' />
        </div>
      ) : isError && !notFound ? (
        <div className='flex flex-col items-center gap-3 py-6 text-sm text-muted-foreground'>
          <span>{t('loading.failed')}</span>
          <Button
            onClick={() => {
              void refetch()
            }}
            size='sm'
            variant='outline'
          >
            {t('action.retry')}
          </Button>
        </div>
      ) : (
        // profile 解析(成功或 404)后才挂 form:defaultValues 只在挂载取一次,
        // 晚到的数据不会回灌,故用加载门 + key 保证按最终 profile 播种。
        <ProfileForm
          key={profile?.updated_at ?? 'empty'}
          profile={profile ?? null}
          userId={userId}
        />
      )}
    </EditSectionCard>
  )
}

function ProfileForm({ userId, profile }: { userId: string; profile: ProfileResponse | null }) {
  const { t } = useTranslation('common')
  const update = useUpdateUserProfile()
  const uploadAvatar = useUploadUserAvatar(userId)

  // 头像与文本分管:上传是独立副作用(先传 content 拿 id),PUT 时才把当前
  // avatarContentId 连同文本一起全量提交。preview/id 成对推进或回退,不发散。
  const [avatarContentId, setAvatarContentId] = useState<string | null>(
    profile?.avatar_content_id ?? null,
  )
  const [preview, setPreview] = useState<string | null>(profile?.avatar_url ?? null)
  const localUrlRef = useRef<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 卸载(含成功保存后因 updated_at 变 key 而重挂、或离开页面)时撤销尚存的本地
  // objectURL,否则每次头像上传都泄漏一个 blob。ref 仅在上传成功后写,故恒安全。
  useEffect(
    () => () => {
      if (localUrlRef.current) {
        URL.revokeObjectURL(localUrlRef.current)
      }
    },
    [],
  )

  async function onPickFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) {
      return
    }
    const prevPreview = preview
    const prevContentId = avatarContentId
    const nextUrl = URL.createObjectURL(file)
    setPreview(nextUrl)
    try {
      // auto-bind:上传即绑定,返回更新后的资料 → 取其 avatar_content_id(表单 Save 时随全量 PUT 保留)。
      const updated = await uploadAvatar.mutateAsync(file)
      if (localUrlRef.current) {
        URL.revokeObjectURL(localUrlRef.current)
      }
      localUrlRef.current = nextUrl
      setAvatarContentId(updated.avatar_content_id ?? null)
    } catch (error) {
      URL.revokeObjectURL(nextUrl)
      setPreview(prevPreview)
      setAvatarContentId(prevContentId)
      toast.error(getErrorMessage(error, t('users.form.avatarUploadFailed')))
    }
  }

  const form = useAppForm({
    defaultValues: { display_name: profile?.display_name ?? '', phone: profile?.phone ?? '' },
    onSubmit: async ({ value }) => {
      // PUT 全量替换:空串按清空(→ null),头像 id 带当前选择。
      try {
        await update.mutateAsync({
          request: {
            avatar_content_id: avatarContentId,
            display_name: value.display_name.trim() || null,
            phone: value.phone.trim() || null,
          },
          userId,
        })
      } catch (error) {
        toast.error(getErrorMessage(error))
        return
      }
      toast.success(t('users.edit.profileSaved'))
    },
  })

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex items-center gap-4'>
        <div className='relative'>
          <Avatar size='lg'>
            <AvatarImage
              alt={profile?.display_name ?? ''}
              src={preview ?? undefined}
            />
            <AvatarFallback>{nameInitials(profile?.display_name)}</AvatarFallback>
          </Avatar>
          {uploadAvatar.isPending ? (
            <span className='absolute inset-0 flex items-center justify-center rounded-full bg-background/60'>
              <Spinner className='size-4' />
            </span>
          ) : null}
        </div>
        <div className='flex flex-col gap-1'>
          <Button
            disabled={uploadAvatar.isPending}
            onClick={() => fileInputRef.current?.click()}
            size='sm'
            type='button'
            variant='outline'
          >
            {t('users.form.changeAvatar')}
          </Button>
          <p className='text-xs text-muted-foreground'>{t('users.form.avatarHint')}</p>
        </div>
        <input
          accept='image/*'
          className='hidden'
          onChange={onPickFile}
          ref={fileInputRef}
          type='file'
        />
      </div>

      <form onSubmit={formSubmitHandler(form.handleSubmit)}>
        <FieldGroup>
          <form.AppField name='display_name'>
            {(field) => (
              <field.TextField
                label={t('users.columns.displayName')}
                placeholder={t('users.form.displayNamePlaceholder')}
              />
            )}
          </form.AppField>
          <form.AppField name='phone'>
            {(field) => (
              <field.TextField
                label={t('users.form.phone')}
                placeholder={t('users.form.phonePlaceholder')}
              />
            )}
          </form.AppField>
          <Field
            className='justify-end'
            orientation='horizontal'
          >
            <form.AppForm>
              <form.SubmitButton
                disabled={uploadAvatar.isPending}
                pendingLabel={t('action.saving')}
              >
                {t('action.save')}
              </form.SubmitButton>
            </form.AppForm>
          </Field>
        </FieldGroup>
      </form>
    </div>
  )
}
