import type { MemberView } from '@/generated/api-types'
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
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { useOpenSnapshot } from '@/hooks/use-open-snapshot'
import { getErrorMessage } from '@/lib/api-client'

interface RemoveMemberDialogProps {
  member: Pick<MemberView, 'display_name' | 'id' | 'username'> | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 真正的移除(本租户 removeMember / 平台 removeTenantMember)。失败抛错 → toast 并留着。 */
  onConfirm: () => Promise<unknown>
}

/** 移出租户的二次确认(账号本身保留)。结构同 DeleteUserDialog。 */
export function RemoveMemberDialog({ member: memberProp, open, onOpenChange, onConfirm }: RemoveMemberDialogProps) {
  const { t } = useTranslation('common')
  // 打开时快照:关闭时调用方把目标清成 null,关闭动画期间名字不该变空。
  const member = useOpenSnapshot(open, memberProp)
  const [pending, setPending] = useState(false)
  const name = member ? (member.display_name ?? '') || member.username : ''

  async function handleConfirm() {
    setPending(true)
    try {
      await onConfirm()
    }
    catch (error) {
      toast.error(getErrorMessage(error))
      return
    }
    finally {
      setPending(false)
    }
    toast.success(t('members.remove.success'))
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
          <AlertDialogTitle>{t('members.remove.title')}</AlertDialogTitle>
          <AlertDialogDescription>{t('members.remove.description', { name })}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose
            disabled={pending}
            render={<Button variant='outline' />}
          >
            {t('action.cancel')}
          </AlertDialogClose>
          {/* 确认键不是 AlertDialogClose:失败要留在原地重试,成功由 handleConfirm 关。 */}
          <Button
            onClick={() => {
              void handleConfirm()
            }}
            pending={pending}
            variant='destructive'
          >
            {t('members.remove.confirm')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  )
}
