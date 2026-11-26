'use client'

import type { ReactNode } from 'react'
import type { MyTenantView } from '@/generated/api-types'

import { ChevronUpDownIcon } from '@gedatou/cadenza-icons'
import { Button, DropdownMenu, DropdownMenuGroup, DropdownMenuGroupLabel, DropdownMenuPopup, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@gedatou/cadenza-ui'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { useMyTenants, useSwitchTenant } from '@/api/auth'
import { BRAND } from '@/brand'
import { PlayOnHover } from '@/components/icon-motion'
import { getErrorMessage } from '@/lib/api-client'

// 切换器只在账号属于 ≥ 2 个租户时出现(spec §1 / §4.8):单租户项目登录后
// 看不到任何租户元素,侧栏左上角仍是品牌。列表没取到(加载中 / 出错)同样按品牌显示。
const MIN_TENANTS_FOR_SWITCHER = 2

interface TenantSwitchOptions {
  /** 软探测取列表(页面可能被匿名访问时用,见 useMyTenants)。 */
  soft?: boolean
  /** 切换成功(缓存已清、当前路由已重新进入)之后再做的事,如离开 /403。 */
  onSwitched?: () => void
}

function useTenantSwitch({ onSwitched, soft }: TenantSwitchOptions = {}) {
  const { t } = useTranslation()
  const { data: tenants } = useMyTenants({ soft })
  const switchTenant = useSwitchTenant()
  // 只认后端标的 current,不拿第一个顶替:没有标记(如平台上下文)时每一项都可点。
  const current = tenants?.find(tenant => tenant.current)
  const switchable = (tenants?.length ?? 0) >= MIN_TENANTS_FOR_SWITCHER

  function select(tenantId: string) {
    if ((current !== undefined && tenantId === current.id) || switchTenant.isPending) {
      return
    }
    switchTenant.mutate(tenantId, {
      onError: error => toast.error(getErrorMessage(error, t('tenant.switcher.failed'))),
      onSuccess: () => onSwitched?.(),
    })
  }

  return { current, select, switchable, tenants: tenants ?? [] }
}

function TenantRadioItems({
  current,
  onSelect,
  tenants,
}: {
  current: MyTenantView | undefined
  onSelect: (tenantId: string) => void
  tenants: MyTenantView[]
}) {
  const { t } = useTranslation()
  return (
    <DropdownMenuGroup>
      <DropdownMenuGroupLabel className='text-xs text-muted-foreground'>
        {t('tenant.switcher.label')}
      </DropdownMenuGroupLabel>
      <DropdownMenuRadioGroup
        value={current?.id ?? ''}
        onValueChange={value => onSelect(String(value))}
      >
        {tenants.map(tenant => (
          <DropdownMenuRadioItem
            key={tenant.id}
            value={tenant.id}
            closeOnClick
          >
            {tenant.name}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </DropdownMenuGroup>
  )
}

function BrandMark({ className }: { className: string }) {
  return <div className={className}>{BRAND.logo}</div>
}

const MARK_CLASS = 'flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground'

/** 后台侧栏左上角:单租户 = 品牌;≥ 2 个租户 = 租户切换器。 */
export function TeamSwitcher() {
  const { isMobile } = useSidebar()
  const { current, select, switchable, tenants } = useTenantSwitch()

  if (!switchable) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size='lg'
            render={<div />}
          >
            <BrandMark className={MARK_CLASS} />
            <div className='grid flex-1 text-left text-sm/tight'>
              <span className='truncate font-medium'>{BRAND.name}</span>
              <span className='truncate text-xs'>{BRAND.tagline}</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <PlayOnHover>
            <DropdownMenuTrigger
              data-tenant-switcher=''
              render={(
                <SidebarMenuButton
                  size='lg'
                  className='data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground'
                />
              )}
            >
              <BrandMark className={MARK_CLASS} />
              <div className='grid flex-1 text-left text-sm/tight'>
                <span className='truncate font-medium'>{current?.name ?? BRAND.name}</span>
                <span className='truncate text-xs'>{current === undefined ? BRAND.tagline : BRAND.name}</span>
              </div>
              <ChevronUpDownIcon className='ml-auto' />
            </DropdownMenuTrigger>
          </PlayOnHover>
          <DropdownMenuPopup
            className='min-w-56'
            align='start'
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <TenantRadioItems
              current={current}
              onSelect={select}
              tenants={tenants}
            />
          </DropdownMenuPopup>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

/**
 * 紧凑变体(公开站顶栏、全屏 403 页):单租户时不渲染任何东西。
 * hint 只在切换器出现时显示在它上方。
 */
export function TenantMenu({ hint, ...options }: TenantSwitchOptions & { hint?: ReactNode }) {
  const { t } = useTranslation()
  const { current, select, switchable, tenants } = useTenantSwitch(options)

  if (!switchable) {
    return null
  }

  const menu = (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-tenant-switcher=''
        aria-label={current === undefined ? t('tenant.switcher.label') : t('tenant.switcher.trigger', { name: current.name })}
        render={(
          <Button
            variant='ghost'
            size='sm'
          />
        )}
      >
        <span className='max-w-40 truncate'>{current?.name ?? t('tenant.switcher.label')}</span>
        <ChevronUpDownIcon className='size-4' />
      </DropdownMenuTrigger>
      <DropdownMenuPopup
        className='min-w-48'
        align='end'
        sideOffset={4}
      >
        <TenantRadioItems
          current={current}
          onSelect={select}
          tenants={tenants}
        />
      </DropdownMenuPopup>
    </DropdownMenu>
  )

  if (hint === undefined) {
    return menu
  }
  return (
    <div className='flex flex-col items-center gap-2'>
      <p className='text-sm text-muted-foreground'>{hint}</p>
      {menu}
    </div>
  )
}
