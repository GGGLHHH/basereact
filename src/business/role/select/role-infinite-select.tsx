import { useCallback, useMemo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import type { RoleView } from '#/generated/api-types'

import { useInfiniteRoleOptions } from '@/api/roles'
import {
  InfiniteCombobox,
  getInfiniteComboboxSelectionProps,
  useInfiniteComboboxState,
  type InfiniteComboboxChildren,
} from '@/components/select/infinite-combobox'
import {
  InfiniteSelectEmpty,
  InfiniteSelectError,
  InfiniteSelectLoading,
  InfiniteSelectLoadingMore,
  InfiniteSelectRetry,
  type ControllableSelectionProps,
  type InfiniteSelectOption,
} from '@/components/select/infinite-select'

interface RoleInfiniteSelectCommonProps {
  children: InfiniteComboboxChildren<RoleView>
  disabled?: boolean

  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void

  contentClassName?: string
  align?: 'start' | 'center' | 'end'

  pageSize?: number

  /** 多选时把 onChange 推迟到弹层关闭(表单过滤类场景)。 */
  commitOnClose?: boolean

  searchPlaceholder?: string

  /**
   * 追加插槽(如底部条 `InfiniteSelectFooter`),接在本组件内置的 i18n 状态插槽**之后**。
   * footer 走这里(不再单独 `footer` prop);footer 内按钮用 `useInfiniteComboboxActions()` 拿 clear/close。
   */
  slots?: ReactNode
}

export type RoleInfiniteSelectProps = RoleInfiniteSelectCommonProps &
  ControllableSelectionProps<RoleView>

/**
 * 角色候选选择器,复用 infinite-select 基座 + `listRoles` 目录。
 *
 * 角色是小而有界集,后端一次返回全量(无服务端搜索),故搜索在前端按 name/display_name
 * 过滤已加载目录 —— 与 user-infinite-select 的服务端 username 搜索不同。
 *
 * 状态文案(空/加载/错误)i18n 在**本业务层**注入(底座 infinite-select 零 i18n);`slots` 追加更多(如 footer)。
 */
export function RoleInfiniteSelect(props: RoleInfiniteSelectProps) {
  const { t } = useTranslation('common')
  const {
    children,
    disabled = false,
    contentClassName,
    align = 'start',
    pageSize,
    commitOnClose = false,
    searchPlaceholder = 'Search roles',
    slots,
  } = props

  const combobox = useInfiniteComboboxState({
    defaultOpen: props.defaultOpen,
    onOpenChange: props.onOpenChange,
    open: props.open,
  })

  const list = useInfiniteRoleOptions({ enabled: combobox.open, pageSize })

  // 无服务端角色搜索:客户端按 name/display_name 过滤已加载的全量目录。
  const query = (combobox.queryValue ?? '').trim().toLowerCase()
  const filteredList = useMemo(() => {
    if (!query) {
      return list
    }
    return {
      ...list,
      items: list.items.filter(
        (role) =>
          role.name.toLowerCase().includes(query) ||
          role.display_name.toLowerCase().includes(query),
      ),
    }
  }, [list, query])

  const getOption = useCallback(
    (role: RoleView): InfiniteSelectOption => ({
      id: role.id,
      label: role.display_name || role.name,
    }),
    [],
  )

  const selectionProps = getInfiniteComboboxSelectionProps<RoleView>(props)

  // 内置 i18n 状态插槽(始终渲染,按状态自显示);调用方 `slots` 追加在其后(如 footer)。
  const stateSlots = (
    <>
      <InfiniteSelectEmpty>{t('loading.empty')}</InfiniteSelectEmpty>
      <InfiniteSelectLoading>{t('loading.loading')}</InfiniteSelectLoading>
      <InfiniteSelectLoadingMore>{t('loading.loadingMore')}</InfiniteSelectLoadingMore>
      <InfiniteSelectError>
        {t('loading.failed')}
        <InfiniteSelectRetry>{t('action.retry')}</InfiniteSelectRetry>
      </InfiniteSelectError>
    </>
  )

  return (
    <InfiniteCombobox<RoleView>
      align={align}
      commitOnClose={props.multiple ? commitOnClose : false}
      contentClassName={contentClassName}
      disabled={disabled}
      getOption={getOption}
      list={filteredList}
      searchPlaceholder={searchPlaceholder}
      slots={
        <>
          {stateSlots}
          {slots}
        </>
      }
      state={combobox}
      {...selectionProps}
    >
      {children}
    </InfiniteCombobox>
  )
}
