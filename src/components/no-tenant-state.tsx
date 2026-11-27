import type { ReactNode } from 'react'
import { ChevronRightIcon, UsersRoundIcon } from '@gedatou/cadenza-icons'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
  Spinner,
} from '@gedatou/cadenza-ui'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { useMyTenants, useSwitchTenant } from '@/api/auth'
import { getErrorMessage } from '@/lib/api-client'

/**
 * 「还没加入任何组织」空状态(spec §4.2):账号通过了登录,但没有任何有效成员关系、
 * 也没有平台角色。文案固定在这里;各 surface 的页面把自己的出口(登出 / 回首页)
 * 作为 children 放进来。
 */
function NoTenantState({ children, className }: { children?: ReactNode, className?: string }) {
  const { t } = useTranslation()
  return (
    <Empty className={className}>
      <EmptyHeader>
        <EmptyMedia variant='icon'>
          <UsersRoundIcon />
        </EmptyMedia>
        <EmptyTitle>{t('tenant.empty.title')}</EmptyTitle>
        <EmptyDescription>{t('tenant.empty.description')}</EmptyDescription>
      </EmptyHeader>
      {children === undefined ? null : <EmptyContent>{children}</EmptyContent>}
    </Empty>
  )
}

interface NoTenantViewProps {
  /** 各 surface 自己的出口(登出 / 回首页),两种状态下都显示。 */
  children?: ReactNode
  /** 进入某个组织成功之后(缓存已清、路由已重新进入)去哪,由页面决定。 */
  onEntered: () => void
  /** 软探测取列表(页面可能被匿名访问时用,见 useMyTenants)。 */
  soft?: boolean
}

/**
 * 「没有当前组织」页的主体:平台上下文里的账号(如升级前的会话、被切出组织后)
 * 可能其实属于组织 —— 切换器只在 ≥ 2 个组织时出现,只属于 1 个组织的人就没有入口。
 * 所以这里先查 GET /auth/tenants:有就列出来让他选一个进入(switch-tenant,1 个也能切),
 * 一个都没有才是「还没加入任何组织」。列表读失败按空状态处理(出口仍在)。
 */
export function NoTenantView({ children, onEntered, soft }: NoTenantViewProps) {
  const { t } = useTranslation()
  const { data: tenants, isPending } = useMyTenants({ soft })
  const switchTenant = useSwitchTenant()

  if (isPending) {
    return <Spinner className='size-6' />
  }

  if (tenants === undefined || tenants.length === 0) {
    return <NoTenantState>{children}</NoTenantState>
  }

  function enter(tenantId: string) {
    if (switchTenant.isPending) {
      return
    }
    switchTenant.mutate(tenantId, {
      onError: error => toast.error(getErrorMessage(error, t('tenant.switcher.failed'))),
      onSuccess: () => onEntered(),
    })
  }

  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant='icon'>
          <UsersRoundIcon />
        </EmptyMedia>
        <EmptyTitle>{t('tenant.choose.title')}</EmptyTitle>
        <EmptyDescription>{t('tenant.choose.description')}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <ItemGroup
          className='w-full min-w-64 text-left'
          aria-label={t('tenant.switcher.label')}
        >
          {tenants.map(tenant => (
            <Item
              key={tenant.id}
              variant='outline'
              size='sm'
              data-tenant-option={tenant.id}
              render={(
                <button
                  type='button'
                  disabled={switchTenant.isPending}
                  onClick={() => enter(tenant.id)}
                />
              )}
            >
              <ItemContent>
                <ItemTitle>{tenant.name}</ItemTitle>
                <ItemDescription>{tenant.slug}</ItemDescription>
              </ItemContent>
              <ItemActions>
                <ChevronRightIcon className='size-4' />
              </ItemActions>
            </Item>
          ))}
        </ItemGroup>
        {children}
      </EmptyContent>
    </Empty>
  )
}
