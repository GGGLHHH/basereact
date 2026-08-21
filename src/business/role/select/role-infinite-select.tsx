import type {
  ControllableSelectionProps,
  InfiniteComboboxStateOptions,
  InfiniteSelectOption,
} from '@gedatou/cadenza-ui'
import type { ReactElement, ReactNode } from 'react'
import type { RoleView } from '#/generated/api-types'
import {
  InfiniteCombobox,
  InfiniteSelectEmpty,
  InfiniteSelectError,
  InfiniteSelectLoadingMore,
  InfiniteSelectLoadingOverlay,
  InfiniteSelectRetry,
  useInfiniteComboboxState,
} from '@gedatou/cadenza-ui'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useInfiniteRoleOptions } from '@/api/roles'
import { getInfiniteComboboxSelectionProps } from '@/components/select/selection-props'

interface RoleInfiniteSelectCommonProps {
  /**
   * 触发器。cadenza 的 children 是位置化的:第一个 child 当 trigger,其后的都进
   * 弹层组合通道 —— 所以这里收窄成单个元素,状态插槽由本组件在其后补齐。
   * (库本身也允许函数形式的 children,但那会把整个 children 当 trigger、不留组合
   *  通道,与本组件要注入 i18n 状态插槽的职责冲突。)
   */
  children: ReactElement
  disabled?: boolean

  open?: boolean
  defaultOpen?: boolean
  /** 第二参是 cadenza 的 eventDetails,`cancel()` 可否决这次开合。 */
  onOpenChange?: InfiniteComboboxStateOptions['onOpenChange']

  contentClassName?: string
  align?: 'start' | 'center' | 'end'

  pageSize?: number

  /** 多选时把 onValueChange 推迟到弹层关闭(表单过滤类场景)。 */
  commitOnClose?: boolean

  searchPlaceholder?: string

  /**
   * 追加插槽(如底部条 `InfiniteSelectFooter`),接在本组件内置的 i18n 状态插槽**之后**。
   * footer 内按钮用 `useInfiniteSelectActions()` 拿 clear/close。
   */
  slots?: ReactNode
}

export type RoleInfiniteSelectProps = RoleInfiniteSelectCommonProps
  & ControllableSelectionProps<RoleView>

/**
 * 角色候选选择器,复用 cadenza 的 `InfiniteCombobox` + `listRoles` 目录。
 *
 * 角色是小而有界集,后端一次返回全量(无服务端搜索),故搜索在前端按 name/display_name
 * 过滤已加载目录 —— 与 user-infinite-select 的服务端 username 搜索不同。
 *
 * 状态文案(空/加载/错误)i18n 在**本业务层**注入(cadenza 零 i18n);`slots` 追加更多(如 footer)。
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
        role =>
          role.name.toLowerCase().includes(query)
          || role.display_name.toLowerCase().includes(query),
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
      commitOnClose={props.selectionMode === 'multiple' ? commitOnClose : false}
      contentClassName={contentClassName}
      disabled={disabled}
      getOption={getOption}
      list={filteredList}
      popoverProps={{ align }}
      searchPlaceholder={searchPlaceholder}
      state={combobox}
      {...selectionProps}
    >
      {children}
      {/* 内置 i18n 状态插槽(始终渲染,按状态自显示);调用方 `slots` 追加在其后。
          首屏加载在 cadenza 里是盖在列表上的磨砂遮罩,不再是替换列表的那一行。 */}
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
