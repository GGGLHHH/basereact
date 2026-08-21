import type { AdminUserView } from '#/generated/api-types'
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
import { useDeleteUser } from '@/api/users'
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
    }
    catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  return (
    <AlertDialog
      // 必须显式声明:cadenza 的 AlertDialog 建在 Base UI 的 Dialog 上(只手工补回
      // role="alertdialog"),因此**默认点外面就关**——与 Base UI 自带 AlertDialog
      // 把它硬编码成 true 的行为相反。这是删除确认框,不能被误触关掉。
      disablePointerDismissal
      open={open}
      onOpenChange={onOpenChange}
    >
      <AlertDialogPopup size='sm'>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('users.delete.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('users.delete.description', { name: user?.username ?? '' })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose
            disabled={del.isPending}
            render={<Button variant='outline' />}
          >
            {t('action.cancel')}
          </AlertDialogClose>
          {/* 确认键刻意不是 AlertDialogClose:删除失败时要留在原地给重试机会,
              关闭由 handleConfirm 成功分支里的 onOpenChange(false) 负责。
              pending(而非 disabled)让按钮在请求中保持可聚焦并播报 aria-busy。 */}
          <Button
            onClick={() => {
              // handleConfirm 自己 catch 并 toast,这里只把 promise 从事件回调里摘掉。
              void handleConfirm()
            }}
            pending={del.isPending}
            variant='destructive'
          >
            {t('users.delete.confirm')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  )
}
