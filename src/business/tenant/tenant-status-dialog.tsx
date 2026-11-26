import type { TenantView } from '@/generated/api-types'
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
  Button,
} from '@gedatou/cadenza-ui'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { useUpdateTenant } from '@/api/tenants'
import { useOpenSnapshot } from '@/hooks/use-open-snapshot'
import { getErrorMessage } from '@/lib/api-client'
import { DEFAULT_TENANT_ID } from '@/lib/default-tenant'
import { useCurrentTenantId } from '@/lib/use-current-session'

interface TenantStatusDialogProps {
  /** null = 无目标(弹窗仍受 open 控制)。 */
  tenant: Pick<TenantView, 'id' | 'name' | 'status'> | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * 停用 / 恢复租户的二次确认。方向由租户当前状态决定:正常 → 停用,已停用 → 恢复。
 * 停用会立即吊销该组织的会话(spec §4.6),所以文案讲清后果;PUT 全量,名称原样带上。
 */
export function TenantStatusDialog({ tenant: tenantProp, open, onOpenChange }: TenantStatusDialogProps) {
  const { t } = useTranslation('common')
  const update = useUpdateTenant()
  const currentTenantId = useCurrentTenantId()
  // 打开时快照:关闭时调用方清空目标、或停用成功后状态翻成 suspended,都不该让关闭动画里的文案跳变。
  const tenant = useOpenSnapshot(open, tenantProp)
  const suspending = tenant?.status !== 'suspended'
  const name = tenant?.name ?? ''
  // 停用默认组织 / 自己当前所在的组织:后果波及所有人(包括自己),额外醒目提示。
  const warning = !suspending || !tenant
    ? null
    : tenant.id === DEFAULT_TENANT_ID
      ? t('tenants.suspend.warningDefault')
      : tenant.id === currentTenantId
        ? t('tenants.suspend.warningCurrent')
        : null

  async function handleConfirm() {
    if (!tenant) {
      return
    }
    try {
      await update.mutateAsync({
        id: tenant.id,
        request: { name: tenant.name, status: suspending ? 'suspended' : 'active' },
      })
    }
    catch (error) {
      toast.error(getErrorMessage(error))
      return
    }
    toast.success(suspending ? t('tenants.suspend.success') : t('tenants.resume.success'))
    onOpenChange(false)
  }

  return (
    <AlertDialog
      // cadenza 的 AlertDialog 默认点外面就关(见 DeleteUserDialog),确认框要显式关掉这条。
      disablePointerDismissal
      open={open}
      onOpenChange={onOpenChange}
    >
      <AlertDialogPopup size='sm'>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {suspending ? t('tenants.suspend.title') : t('tenants.resume.title')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {suspending
              ? t('tenants.suspend.description', { name })
              : t('tenants.resume.description', { name })}
          </AlertDialogDescription>
          {warning === null
            ? null
            : (
                <p
                  className='rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive'
                  role='alert'
                >
                  {warning}
                </p>
              )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose
            disabled={update.isPending}
            render={<Button variant='outline' />}
          >
            {t('action.cancel')}
          </AlertDialogClose>
          {/* 确认键不是 AlertDialogClose:失败留在原地重试,成功由 handleConfirm 关。 */}
          <Button
            onClick={() => {
              void handleConfirm()
            }}
            pending={update.isPending}
            variant={suspending ? 'destructive' : 'default'}
          >
            {suspending ? t('tenants.suspend.confirm') : t('tenants.resume.confirm')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  )
}
