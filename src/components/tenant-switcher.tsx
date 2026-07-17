import { useNavigate } from '@tanstack/react-router'
import { IconBuilding, IconCheck, IconChevronDown } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'

import { useMyTenants, useSwitchTenant } from '@/api/tenants'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

/**
 * 顶栏租户切换器(同 Slack/Linear 的公司下拉)。
 *
 * - **0 租户时不渲染**:register 的常规出口,他还没有任何公司,给个空下拉只会困惑。
 * - **1 个租户时不渲染**:没得切,一个静态标签比一个假装能点的下拉诚实。
 * - 切换成功后 `queryClient.clear()`(见 `useSwitchTenant`)+ **跳回首页**:内存里所有列表
 *   都还属于旧公司,重新进页面才会拉到新租户的数据。
 */
export function TenantSwitcher() {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const { data: tenants } = useMyTenants()
  const switchTenant = useSwitchTenant()

  // 少于两个 → 无从切换,不占位。
  if (!tenants || tenants.length < 2) return null

  const active = tenants.find((x) => x.is_active)

  function onSelect(id: string) {
    if (id === active?.id || switchTenant.isPending) return
    switchTenant.mutate(
      { tenant_id: id },
      // 缓存已在 mutation 的 onSuccess 里全清 + 种好新 me;这里只负责离开当前页,
      // 回首页重新拉本租户数据(留在原页会用清空后的缓存重新请求,数据虽对但可能落在
      // 一个当前租户没有对应资源的详情页上)。
      { onSuccess: () => void navigate({ to: '/frontend/home' }) },
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant='outline'
            size='sm'
            disabled={switchTenant.isPending}
            className='gap-2'
          >
            <IconBuilding className='size-4' />
            <span className='max-w-48 truncate'>{active?.display_name ?? t('tenant.none')}</span>
            <IconChevronDown className='size-4 opacity-60' />
          </Button>
        }
      />
      <DropdownMenuContent
        align='end'
        className='min-w-56'
      >
        <DropdownMenuLabel>{t('tenant.switchLabel')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {tenants.map((tenant) => (
          <DropdownMenuItem
            key={tenant.id}
            onClick={() => onSelect(tenant.id)}
            className='justify-between gap-3'
          >
            <span className='truncate'>{tenant.display_name}</span>
            {tenant.is_active ? <IconCheck className='size-4 shrink-0' /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
