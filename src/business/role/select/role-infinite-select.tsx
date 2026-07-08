import { useCallback, useMemo, type ReactNode } from 'react'

import type { RoleView } from '#/generated/api-types'

import { useInfiniteRoleOptions } from '@/api/roles'
import {
  InfiniteCombobox,
  getInfiniteComboboxSelectionProps,
  useInfiniteComboboxState,
  type InfiniteComboboxChildren,
} from '@/components/select/infinite-combobox'
import {
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
  emptyLabel?: ReactNode
  loadingLabel?: ReactNode
  loadingMoreLabel?: ReactNode
  errorLabel?: ReactNode
  retryLabel?: ReactNode
}

export type RoleInfiniteSelectProps = RoleInfiniteSelectCommonProps &
  ControllableSelectionProps<RoleView>

/**
 * 角色候选选择器,复用 infinite-select 基座 + `listRoles` 目录。
 *
 * 角色是小而有界集,后端一次返回全量(无服务端搜索),故搜索在前端按 name/display_name
 * 过滤已加载目录 —— 与 user-infinite-select 的服务端 username 搜索不同。
 */
export function RoleInfiniteSelect(props: RoleInfiniteSelectProps) {
  const {
    children,
    disabled = false,
    contentClassName,
    align = 'start',
    pageSize,
    commitOnClose = false,
    searchPlaceholder = 'Search roles',
    emptyLabel,
    loadingLabel,
    loadingMoreLabel,
    errorLabel,
    retryLabel,
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

  return (
    <InfiniteCombobox<RoleView>
      align={align}
      commitOnClose={props.multiple ? commitOnClose : false}
      contentClassName={contentClassName}
      disabled={disabled}
      emptyLabel={emptyLabel}
      errorLabel={errorLabel}
      getOption={getOption}
      list={filteredList}
      loadingLabel={loadingLabel}
      loadingMoreLabel={loadingMoreLabel}
      retryLabel={retryLabel}
      searchPlaceholder={searchPlaceholder}
      state={combobox}
      {...selectionProps}
    >
      {children}
    </InfiniteCombobox>
  )
}
