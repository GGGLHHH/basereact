import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import type { AdminUserView } from '#/generated/api-types'

import { useDeleteUser } from '@/api/users'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { getErrorMessage } from '@/lib/api-client'

interface DeleteUserDialogProps {
  /** null = 无待删目标(弹窗仍受 open 控制,内容用空名兜底)。 */
  user: Pick<AdminUserView, 'id' | 'username'> | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 删除成功后回调:列表页留在原地(靠失效刷新),详情页跳回列表。 */
  onDeleted?: () => void
}

/** 删除用户二次确认弹窗。成功后关闭并回调;失败 toast,不关闭(留重试)。 */
export function DeleteUserDialog({ user, open, onOpenChange, onDeleted }: DeleteUserDialogProps) {
  const { t } = useTranslation('common')
  const del = useDeleteUser()

  async function handleConfirm() {
    if (!user) {
      return
    }
    try {
      await del.mutateAsync(user.id)
      toast.success(t('users.delete.success'))
      onOpenChange(false)
      onDeleted?.()
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <AlertDialogContent size='sm'>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('users.delete.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('users.delete.description', { name: user?.username ?? '' })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={del.isPending}>{t('action.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            disabled={del.isPending}
            onClick={handleConfirm}
            variant='destructive'
          >
            {t('users.delete.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
