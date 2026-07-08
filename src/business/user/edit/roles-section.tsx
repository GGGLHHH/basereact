import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import type { AdminUserView, RoleView } from '#/generated/api-types'

import { useRoles } from '@/api/roles'
import { useSetUserRoles } from '@/api/users'
import { RoleInfiniteSelect } from '@/business/role/select/role-infinite-select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { getErrorMessage } from '@/lib/api-client'

import { EditSectionCard } from './section-card'

// 角色目录(name↔id)在此加载,既给回填映射、也确保编辑器按最终目录播种。
export function RolesSection({ user }: { user: AdminUserView }) {
  const { t } = useTranslation('common')
  const { data: catalog, isLoading, isError, refetch } = useRoles()

  return (
    <EditSectionCard
      description={t('users.edit.rolesDescription')}
      title={t('users.edit.rolesTitle')}
    >
      {isLoading ? (
        <div className='flex justify-center py-6'>
          <Spinner className='size-6' />
        </div>
      ) : isError ? (
        // 目录加载失败绝不能渲染可保存的空编辑器:save 是全量替换,空 seed 一存就
        // 清空用户全部角色(静默数据丢失)。改渲染重试态。
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
        <RolesEditor
          key={user.id}
          catalog={catalog ?? []}
          user={user}
        />
      )}
    </EditSectionCard>
  )
}

// 后端 setUserRoles 收角色 id;AdminUserView.roles 是名字。用目录桥接:
// 回填时名→id,展示时 id→label。存活角色名唯一,映射无歧义。
function RolesEditor({ user, catalog }: { user: AdminUserView; catalog: RoleView[] }) {
  const { t } = useTranslation('common')
  const setRoles = useSetUserRoles()

  const nameToId = useMemo(() => new Map(catalog.map((r) => [r.name, r.id])), [catalog])
  const idToLabel = useMemo(
    () => new Map(catalog.map((r) => [r.id, r.display_name || r.name])),
    [catalog],
  )
  const initialIds = useMemo(
    () =>
      user.roles.map((name) => nameToId.get(name)).filter((id): id is string => id !== undefined),
    [user.roles, nameToId],
  )

  const [selectedIds, setSelectedIds] = useState<string[]>(initialIds)

  async function save() {
    try {
      await setRoles.mutateAsync({ id: user.id, roles: selectedIds })
    } catch (error) {
      toast.error(getErrorMessage(error))
      return
    }
    toast.success(t('users.edit.rolesSaved'))
  }

  return (
    <div className='flex flex-col gap-3'>
      <RoleInfiniteSelect
        multiple
        onChange={(_items, ids) => setSelectedIds(ids)}
        value={selectedIds}
      >
        <Button
          className='h-auto min-h-9 w-full justify-between'
          type='button'
          variant='outline'
        >
          <span className='flex flex-1 flex-wrap items-center gap-1'>
            {selectedIds.length === 0 ? (
              <span className='text-muted-foreground'>{t('users.form.rolesPlaceholder')}</span>
            ) : (
              selectedIds.map((id) => (
                <Badge
                  key={id}
                  variant='secondary'
                >
                  {idToLabel.get(id) ?? id}
                </Badge>
              ))
            )}
          </span>
          <span className='i-lucide-chevron-down size-4 shrink-0 opacity-50' />
        </Button>
      </RoleInfiniteSelect>
      <div className='flex justify-end'>
        <Button
          disabled={setRoles.isPending}
          onClick={save}
          type='button'
        >
          {t('action.save')}
        </Button>
      </div>
    </div>
  )
}
