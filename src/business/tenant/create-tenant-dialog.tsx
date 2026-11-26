import type { TenantView } from '@/generated/api-types'
import {
  Button,
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogTitle,
} from '@gedatou/cadenza-ui'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import { useCreateTenant } from '@/api/tenants'
import { FieldGroup } from '@/components/field'
import { formProps, useAppForm } from '@/components/form'
import { clearServerError } from '@/components/form/server-error'
import { ApiErrorClass, getErrorMessage } from '@/lib/api-client'

// 与后端同口径(CreateTenantRequest 文档):1-63 个小写字母 / 数字 / 连字符,不以连字符开头或结尾。
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/

interface CreateTenantDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 建好之后(弹窗已关)。列表页用它跳到详情去指定第一个管理员。 */
  onCreated?: (tenant: TenantView) => void
}

export function CreateTenantDialog({ open, onOpenChange, onCreated }: CreateTenantDialogProps) {
  const { t } = useTranslation('common')
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogPopup>
        <DialogHeader>
          <DialogTitle>{t('tenants.create.title')}</DialogTitle>
          <DialogDescription>{t('tenants.create.description')}</DialogDescription>
        </DialogHeader>
        <CreateTenantForm
          onCreated={(tenant) => {
            onOpenChange(false)
            onCreated?.(tenant)
          }}
        />
      </DialogPopup>
    </Dialog>
  )
}

function CreateTenantForm({ onCreated }: { onCreated: (tenant: TenantView) => void }) {
  const { t } = useTranslation('common')
  const create = useCreateTenant()

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().refine((value) => {
          const length = value.trim().length
          return length > 0 && length <= 100
        }, t('tenants.create.nameInvalid')),
        slug: z.string().regex(SLUG_PATTERN, t('tenants.create.slugInvalid')),
      }),
    [t],
  )

  const form = useAppForm({
    defaultValues: { name: '', slug: '' },
    validators: { onChange: schema },
    onSubmit: async ({ value }) => {
      let tenant: TenantView
      try {
        tenant = await create.mutateAsync({ name: value.name.trim(), slug: value.slug })
      }
      catch (error) {
        // 409 = slug 被占用(含已删除租户,slug 不复用):落在 slug 字段下。
        if (error instanceof ApiErrorClass && error.status === 409) {
          const message = t('tenants.create.slugTaken')
          form.setFieldMeta('slug', prev => ({ ...prev, errorMap: { ...prev.errorMap, onServer: message } }))
        }
        else {
          toast.error(getErrorMessage(error))
        }
        return
      }
      toast.success(t('tenants.create.success'))
      onCreated(tenant)
    },
  })

  return (
    <form {...formProps(form)}>
      <FieldGroup>
        <form.AppField name='name'>
          {field => (
            <field.TextField
              autoComplete='off'
              label={t('tenants.create.name')}
              placeholder={t('tenants.create.namePlaceholder')}
              required
            />
          )}
        </form.AppField>
        <form.AppField
          listeners={{ onChange: clearServerError }}
          name='slug'
        >
          {field => (
            <field.TextField
              autoCapitalize='none'
              autoComplete='off'
              className='font-mono'
              label={t('tenants.create.slug')}
              labelEnd={<span className='text-xs text-muted-foreground'>{t('tenants.create.slugHint')}</span>}
              placeholder={t('tenants.create.slugPlaceholder')}
              required
              spellCheck={false}
            />
          )}
        </form.AppField>
      </FieldGroup>
      <DialogFooter>
        <DialogClose render={<Button variant='outline' />}>{t('action.cancel')}</DialogClose>
        <form.AppForm>
          <form.SubmitButton pendingLabel={t('action.saving')}>{t('tenants.create.submit')}</form.SubmitButton>
        </form.AppForm>
      </DialogFooter>
    </form>
  )
}
