import type {
  ControllableSelectionProps,
  InfiniteComboboxStateOptions,
  InfiniteSelectOption,
} from '@gedatou/cadenza-ui'
import type { ReactElement, ReactNode } from 'react'
import type { AdminUserView } from '#/generated/api-types'
import {
  InfiniteCombobox,
  InfiniteSelectEmpty,
  InfiniteSelectError,
  InfiniteSelectLoadingMore,
  InfiniteSelectLoadingOverlay,
  InfiniteSelectRetry,
  useInfiniteComboboxState,
} from '@gedatou/cadenza-ui'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useInfiniteUserOptions } from '@/api/users'
import { getInfiniteComboboxSelectionProps } from '@/components/select/selection-props'

interface UserInfiniteSelectCommonProps {
  /** 触发器。位置化 children:第一个 child 是 trigger,状态插槽由本组件在其后补齐。 */
  children: ReactElement
  disabled?: boolean

  open?: boolean
  defaultOpen?: boolean
  /** 第二参是 cadenza 的 eventDetails,`cancel()` 可否决这次开合。 */
  onOpenChange?: InfiniteComboboxStateOptions['onOpenChange']

  contentClassName?: string
  align?: 'start' | 'center' | 'end'

  pageSize?: number

  /**
   * Defers multi-select `onValueChange` until the popover closes.
   *
   * Useful for table filters where each external change updates the URL and
   * refetches the table.
   */
  commitOnClose?: boolean

  searchPlaceholder?: string

  /** 追加插槽(如底部条),接在本组件内置的 i18n 状态插槽之后。 */
  slots?: ReactNode
}

export type UserInfiniteSelectProps = UserInfiniteSelectCommonProps
  & ControllableSelectionProps<AdminUserView>

/**
 * User-specific select wrapper combining user queries and cadenza's `InfiniteCombobox`.
 *
 * 状态文案(空/加载/错误)i18n 在**本业务层**注入(cadenza 零 i18n),可用 `slots` 追加。
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
      label: (user.display_name ?? '') || user.username,
    }),
    [],
  )

  const selectionProps = getInfiniteComboboxSelectionProps<AdminUserView>(props)

  return (
    <InfiniteCombobox<AdminUserView>
      commitOnClose={props.selectionMode === 'multiple' ? commitOnClose : false}
      contentClassName={contentClassName}
      disabled={disabled}
      getOption={getOption}
      list={list}
      popoverProps={{ align }}
      searchPlaceholder={searchPlaceholder}
      state={combobox}
      {...selectionProps}
    >
      {children}
      <InfiniteSelectEmpty>{t('loading.empty')}</InfiniteSelectEmpty>
      <InfiniteSelectLoadingOverlay>{t('loading.loading')}</InfiniteSelectLoadingOverlay>
      <InfiniteSelectLoadingMore>{t('loading.loadingMore')}</InfiniteSelectLoadingMore>
      <InfiniteSelectError>
        {t('loading.failed')}
        <InfiniteSelectRetry>{t('action.retry')}</InfiniteSelectRetry>
      </InfiniteSelectError>
      {slots}
    </InfiniteCombobox>
  )
}
