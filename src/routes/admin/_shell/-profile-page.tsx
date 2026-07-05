import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import type { ChangeEvent } from 'react'

import { useMyProfile, useUpdateProfile, useUploadAvatar } from '@/api/profile'
import { formSubmitHandler, useAppForm } from '@/components/form'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldGroup } from '@/components/field'
import { Spinner } from '@/components/ui/spinner'
import { getErrorMessage } from '@/lib/api-client'
import { nameInitials } from '@/lib/display-name'

// 页面组件独立成非路由文件(`-` 前缀不进路由生成),路由文件保持薄:既能
// 被测试直接 import,又不触发 tanstack-router 的"路由文件多导出破坏代码分割"告警。
export function ProfilePage() {
  const { t } = useTranslation()
  // loader 已 ensure,首帧即有数据。
  const { data: profile } = useMyProfile()
  const update = useUpdateProfile()
  const uploadAvatar = useUploadAvatar()

  // 头像与表单文本分开管:上传是独立副作用(先传 content 拿 id),PUT 时才把
  // 当前 avatarContentId 连同文本一起全量提交。preview 存本地 objectURL 或
  // 服务端相对 avatar_url,即时可见;PUT 成功刷新 profile 后 avatar_url 归位。
  const [avatarContentId, setAvatarContentId] = useState<string | null>(
    profile?.avatar_content_id ?? null,
  )
  const [preview, setPreview] = useState<string | null>(profile?.avatar_url ?? null)
  const localUrlRef = useRef<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function onPickFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // 允许再次选同一文件:清空 input value。
    event.target.value = ''
    if (!file) {
      return
    }
    // preview 与 avatarContentId 是一对:成对推进/回退,任何情况下不发散
    // (否则失败的二次上传会让"看到的头像"与"将保存的 id"对不上)。
    const prevPreview = preview
    const prevContentId = avatarContentId
    const nextUrl = URL.createObjectURL(file)
    setPreview(nextUrl)
    try {
      const content = await uploadAvatar.mutateAsync(file)
      // 成功:采纳新 objectURL,撤销上一枚本地 URL(服务端 avatar_url 非 objectURL,
      // localUrlRef 为 null 时跳过撤销)。
      if (localUrlRef.current) {
        URL.revokeObjectURL(localUrlRef.current)
      }
      localUrlRef.current = nextUrl
      setAvatarContentId(content.id)
    } catch (error) {
      // 失败:撤销这枚失败 URL,预览与 id 一起回退到选前状态。
      URL.revokeObjectURL(nextUrl)
      setPreview(prevPreview)
      setAvatarContentId(prevContentId)
      toast.error(getErrorMessage(error, t('profile.avatarUploadFailed')))
    }
  }

  const form = useAppForm({
    defaultValues: {
      display_name: profile?.display_name ?? '',
      phone: profile?.phone ?? '',
    },
    onSubmit: async ({ value }) => {
      if (!profile) {
        return
      }
      // PUT 全量替换:空串按清空(→ null)提交,avatar_content_id 带当前选择。
      try {
        await update.mutateAsync({
          userId: profile.user_id,
          request: {
            display_name: value.display_name.trim() || null,
            phone: value.phone.trim() || null,
            avatar_content_id: avatarContentId,
          },
        })
        toast.success(t('profile.saved'))
      } catch (error) {
        toast.error(getErrorMessage(error))
      }
    },
  })

  if (!profile) {
    return null
  }

  return (
    <Card className='flex-1'>
      <CardHeader>
        <CardTitle>{t('profile.title')}</CardTitle>
        <CardDescription>{t('profile.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className='mb-6 flex items-center gap-4'>
          <div className='relative'>
            <Avatar size='lg'>
              <AvatarImage
                src={preview ?? undefined}
                alt={profile.display_name ?? ''}
              />
              <AvatarFallback>{nameInitials(profile.display_name)}</AvatarFallback>
            </Avatar>
            {uploadAvatar.isPending ? (
              <span className='absolute inset-0 flex items-center justify-center rounded-full bg-background/60'>
                <Spinner className='size-4' />
              </span>
            ) : null}
          </div>
          <div className='flex flex-col gap-1'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              disabled={uploadAvatar.isPending}
              onClick={() => fileInputRef.current?.click()}
            >
              {t('profile.changeAvatar')}
            </Button>
            <p className='text-xs text-muted-foreground'>{t('profile.avatarHint')}</p>
          </div>
          <input
            ref={fileInputRef}
            type='file'
            accept='image/*'
            className='hidden'
            onChange={onPickFile}
          />
        </div>

        <form onSubmit={formSubmitHandler(form.handleSubmit)}>
          <FieldGroup>
            <form.AppField name='display_name'>
              {(field) => (
                <field.TextField
                  label={t('profile.displayName')}
                  placeholder={t('profile.displayNamePlaceholder')}
                />
              )}
            </form.AppField>
            <form.AppField name='phone'>
              {(field) => (
                <field.TextField
                  label={t('profile.phone')}
                  placeholder={t('profile.phonePlaceholder')}
                />
              )}
            </form.AppField>
            <Field>
              <form.AppForm>
                <form.SubmitButton
                  disabled={uploadAvatar.isPending}
                  pendingLabel={t('action.saving')}
                >
                  {t('action.saveChanges')}
                </form.SubmitButton>
              </form.AppForm>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
