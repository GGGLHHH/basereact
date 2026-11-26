import type { MemberView } from '@/generated/api-types'
import { UserPlusIcon } from '@gedatou/cadenza-icons'
import { Button, SearchField } from '@gedatou/cadenza-ui'
import { getRouteApi } from '@tanstack/react-router'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useMembers, useRemoveMember, useSetMemberRoles } from '@/api/members'
import { AddMemberDialog } from '@/business/member/add-member-dialog'
import { EditMemberRolesDialog } from '@/business/member/edit-member-roles-dialog'
import { RemoveMemberDialog } from '@/business/member/remove-member-dialog'
import { MemberTable } from '@/business/member/table'
import { canManageMember } from '@/business/user/roles'
import { PlayOnHover } from '@/components/icon-motion'
import { toDataPagination } from '@/components/table/pagination'
import { useMyPermissions, usePolicyGranted } from '@/lib/use-access-policy'
import { useCurrentUserId } from '@/lib/use-current-session'

// 组件与路由定义分文件(tanstack-route-page-split):按 id 取路由 API,免回头 import Route。
const routeApi = getRouteApi('/admin/_shell/members')

export function MembersPage() {
  const { page, size, q } = routeApi.useSearch()
  const navigate = routeApi.useNavigate()
  const { t } = useTranslation('common')
  const { data, isPending } = useMembers({ page, size, q })
  const { total } = toDataPagination(data?.page_info)

  // 按钮级准入(真正的拦截在后端):没有 members:admin 只能看。
  const canAdd = usePolicyGranted('addMember')
  const canSetRoles = usePolicyGranted('setMemberRoles')
  const canRemove = usePolicyGranted('removeMember')

  const currentUserId = useCurrentUserId()
  // 持平台角色的成员只有 platform:roles 能改角色 / 移出:其余组织管理员看不到这两个按钮。
  const permissions = useMyPermissions()
  const canManage = useCallback(
    (member: MemberView) => canManageMember(member, permissions),
    [permissions],
  )
  const setRoles = useSetMemberRoles()
  const remove = useRemoveMember()

  const [addOpen, setAddOpen] = useState(false)
  // 待操作目标即弹窗开合信号。
  const [rolesTarget, setRolesTarget] = useState<MemberView | null>(null)
  const [removeTarget, setRemoveTarget] = useState<MemberView | null>(null)

  return (
    <>
      <div className='flex items-center justify-between gap-2'>
        <SearchField
          className='max-w-xs'
          defaultValue={q}
          placeholder={t('members.searchPlaceholder')}
          // q 变即回第 1 页;SearchField 已归一化(trim 后空串 → undefined)。
          onQueryValueChange={(next) => {
            void navigate({ resetScroll: false, search: prev => ({ ...prev, page: 1, q: next }) })
          }}
        />
        {canAdd
          ? (
              <PlayOnHover>
                <Button onClick={() => setAddOpen(true)}>
                  <UserPlusIcon className='size-4' />
                  {t('members.add')}
                </Button>
              </PlayOnHover>
            )
          : null}
      </div>
      <MemberTable
        canManage={canManage}
        currentUserId={currentUserId}
        data={data?.items ?? []}
        isLoading={isPending}
        limit={size}
        page={page}
        total={total}
        onEditRoles={canSetRoles ? setRolesTarget : undefined}
        onLimitChange={(limit) => {
          void navigate({ resetScroll: false, search: prev => ({ ...prev, page: 1, size: limit }) })
        }}
        onPageChange={(nextPage) => {
          void navigate({ resetScroll: false, search: prev => ({ ...prev, page: nextPage }) })
        }}
        onRemove={canRemove ? setRemoveTarget : undefined}
      />
      <AddMemberDialog
        open={addOpen}
        onOpenChange={setAddOpen}
      />
      <EditMemberRolesDialog
        member={rolesTarget}
        open={rolesTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRolesTarget(null)
          }
        }}
        onSubmit={async (roles) => {
          if (rolesTarget) {
            await setRoles.mutateAsync({ roles, userId: rolesTarget.id })
          }
        }}
      />
      <RemoveMemberDialog
        member={removeTarget}
        open={removeTarget !== null}
        onConfirm={async () => {
          if (removeTarget) {
            await remove.mutateAsync(removeTarget.id)
          }
        }}
        onOpenChange={(open) => {
          if (!open) {
            setRemoveTarget(null)
          }
        }}
      />
    </>
  )
}
