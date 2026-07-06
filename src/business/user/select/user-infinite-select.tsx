import { useCallback, type ReactNode } from 'react'

import type { AdminUserView } from '#/generated/api-types'

import { useInfiniteUserOptions } from '@/api/users'
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

interface UserInfiniteSelectCommonProps {
  children: InfiniteComboboxChildren<AdminUserView>
  disabled?: boolean

  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void

  contentClassName?: string
  align?: 'start' | 'center' | 'end'

  pageSize?: number

  /**
   * Defers multi-select `onChange` until the popover closes.
   *
   * Useful for table filters where each external change updates the URL and
   * refetches the table.
   */
  commitOnClose?: boolean

  searchPlaceholder?: string
  emptyLabel?: ReactNode
  loadingLabel?: ReactNode
  loadingMoreLabel?: ReactNode
  errorLabel?: ReactNode
  retryLabel?: ReactNode
}

export type UserInfiniteSelectProps = UserInfiniteSelectCommonProps &
  ControllableSelectionProps<AdminUserView>

/**
 * User-specific select wrapper combining user queries and `InfiniteCombobox`.
 */
export function UserInfiniteSelect(props: UserInfiniteSelectProps) {
  const {
    children,
    disabled = false,
    contentClassName,
    align = 'start',
    pageSize,
    commitOnClose = false,
    searchPlaceholder = 'Search user by name',
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

  const list = useInfiniteUserOptions({
    search: combobox.queryValue,
    pageSize,
    enabled: combobox.open,
  })

  const getOption = useCallback(
    (user: AdminUserView): InfiniteSelectOption => ({
      id: user.id,
      label: user.display_name || user.username,
    }),
    [],
  )

  const selectionProps = getInfiniteComboboxSelectionProps<AdminUserView>(props)

  return (
    <InfiniteCombobox<AdminUserView>
      align={align}
      commitOnClose={props.multiple ? commitOnClose : false}
      contentClassName={contentClassName}
      disabled={disabled}
      emptyLabel={emptyLabel}
      errorLabel={errorLabel}
      getOption={getOption}
      list={list}
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
