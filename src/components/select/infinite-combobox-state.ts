import type { ControllableSelectionProps } from '@/components/select/infinite-select'

import { useControllableValue, useDebounceFn } from 'ahooks'
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'

// 从 infinite-combobox.tsx 拆出来:hook 和纯函数是非组件,和那边的 InfiniteCombobox
// 同住会拦住 Fast Refresh(react-refresh/only-export-components)。
// 类型仍由 infinite-combobox.tsx 以 type-only 形式再导出,调用方按需取。

export interface InfiniteComboboxStateOptions {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  searchValue?: string
  defaultSearchValue?: string
  onSearchValueChange?: (value: string) => void
  queryValue?: string
  defaultQueryValue?: string
  onQueryValueChange?: (value: string | undefined) => void
  debounceMs?: number
}

export interface InfiniteComboboxState<T = unknown> {
  open: boolean
  setOpen: (open: boolean) => void
  searchValue: string
  setSearchValue: (value: string) => void
  resetSearch: () => void
  queryValue: string | undefined
  selectedValue?: string | string[] | undefined
  selectedItems?: T[]
}

export function useInfiniteComboboxState({
  open,
  defaultOpen,
  onOpenChange,
  searchValue,
  defaultSearchValue,
  onSearchValueChange,
  queryValue,
  defaultQueryValue,
  onQueryValueChange,
  debounceMs = 300,
}: InfiniteComboboxStateOptions = {}): InfiniteComboboxState {
  const openProps: {
    open?: boolean
    defaultOpen?: boolean
    onOpenChange?: (open: boolean) => void
  } = {}
  if (open !== undefined)
    openProps.open = open
  if (defaultOpen !== undefined)
    openProps.defaultOpen = defaultOpen
  if (onOpenChange)
    openProps.onOpenChange = onOpenChange

  const [openState, setOpenState] = useControllableValue<boolean>(openProps, {
    defaultValue: false,
    defaultValuePropName: 'defaultOpen',
    trigger: 'onOpenChange',
    valuePropName: 'open',
  })

  const searchProps: {
    searchValue?: string
    defaultSearchValue?: string
    onSearchValueChange?: (value: string) => void
  } = {}
  if (searchValue !== undefined)
    searchProps.searchValue = searchValue
  if (defaultSearchValue !== undefined)
    searchProps.defaultSearchValue = defaultSearchValue
  if (onSearchValueChange)
    searchProps.onSearchValueChange = onSearchValueChange

  const [inputValue, setInputValue] = useControllableValue<string>(searchProps, {
    defaultValue: '',
    defaultValuePropName: 'defaultSearchValue',
    trigger: 'onSearchValueChange',
    valuePropName: 'searchValue',
  })

  const queryProps: {
    queryValue?: string
    defaultQueryValue?: string
    onQueryValueChange?: (value: string | undefined) => void
  } = {}
  if (queryValue !== undefined)
    queryProps.queryValue = queryValue
  if (defaultQueryValue !== undefined)
    queryProps.defaultQueryValue = defaultQueryValue
  if (onQueryValueChange)
    queryProps.onQueryValueChange = onQueryValueChange

  const [queryState, setQueryState] = useControllableValue<string | undefined>(queryProps, {
    defaultValue: undefined,
    defaultValuePropName: 'defaultQueryValue',
    trigger: 'onQueryValueChange',
    valuePropName: 'queryValue',
  })

  const { run: emitQueryValue, cancel: cancelQueryValue } = useDebounceFn<(value: string) => void>(
    (value: string) => {
      setQueryState(value === '' ? undefined : value)
    },
    { wait: debounceMs },
  )

  useEffect(() => cancelQueryValue, [cancelQueryValue])

  const setSearchValue = useCallback(
    (value: string) => {
      setInputValue(value)
      emitQueryValue(value)
    },
    [emitQueryValue, setInputValue],
  )

  const resetSearch = useCallback(() => {
    cancelQueryValue()
    setInputValue('')
    setQueryState(undefined)
  }, [cancelQueryValue, setInputValue, setQueryState])

  const shouldResetOnNextOpenRef = useRef(false)
  const prevOpenRef = useRef<boolean | undefined>(undefined)

  const setOpen = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen && shouldResetOnNextOpenRef.current) {
        resetSearch()
        shouldResetOnNextOpenRef.current = false
      }

      if (!nextOpen) {
        shouldResetOnNextOpenRef.current = true
      }

      setOpenState(nextOpen)
    },
    [resetSearch, setOpenState],
  )

  useLayoutEffect(() => {
    const wasOpen = prevOpenRef.current
    prevOpenRef.current = openState

    if (wasOpen === true && !openState) {
      shouldResetOnNextOpenRef.current = true
      return
    }

    if (wasOpen === false && openState && shouldResetOnNextOpenRef.current) {
      resetSearch()
      shouldResetOnNextOpenRef.current = false
    }
  }, [openState, resetSearch])

  return {
    open: openState,
    queryValue: queryState,
    resetSearch,
    searchValue: inputValue,
    setOpen,
    setSearchValue,
  }
}

export function getInfiniteComboboxSelectionProps<T>(
  props: ControllableSelectionProps<T>,
): ControllableSelectionProps<T> {
  if (props.multiple) {
    return {
      ...(props.value !== undefined ? { value: props.value } : {}),
      ...(props.defaultValue !== undefined ? { defaultValue: props.defaultValue } : {}),
      multiple: true,
      onChange: props.onChange,
    }
  }

  return {
    ...(props.value !== undefined ? { value: props.value } : {}),
    ...(props.defaultValue !== undefined ? { defaultValue: props.defaultValue } : {}),
    onChange: props.onChange,
  }
}
