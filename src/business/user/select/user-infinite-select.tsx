import { useCallback, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import type { AdminUserView } from '#/generated/api-types'

import { useInfiniteUserOptions } from '@/api/users'
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

  /** 追加插槽(如底部条),接在本组件内置的 i18n 状态插槽之后。 */
  slots?: ReactNode
}

export type UserInfiniteSelectProps = UserInfiniteSelectCommonProps &
  ControllableSelectionProps<AdminUserView>

/**
 * User-specific select wrapper combining user queries and `InfiniteCombobox`.
 *
 * 状态文案(空/加载/错误)i18n 在**本业务层**注入(底座 infinite-select 零 i18n),可用 `slots` 覆盖。
 */
export function UserInfiniteSelect(props: UserInfiniteSelectProps) {
  const { t } = useTranslation('common')
  const {
    children,
    disabled = false,
    contentClassName,
    align = 'start',
    pageSize,
    commitOnClose = false,
    searchPlaceholder = 'Search user by name',
    slots,
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

  // 内置 i18n 状态插槽(始终渲染,按状态自显示);调用方 `slots` 追加在其后。
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
    <InfiniteCombobox<AdminUserView>
      align={align}
      commitOnClose={props.multiple ? commitOnClose : false}
      contentClassName={contentClassName}
      disabled={disabled}
      getOption={getOption}
      list={list}
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
