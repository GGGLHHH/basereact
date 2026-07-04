import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type {
  AdminListWidgetsQuery,
  CreateWidget,
  ListWidgetsQuery,
  UpdateWidget,
} from '#/generated/api-types'
import {
  adminListWidgets as adminListWidgetsApi,
  createWidget as createWidgetApi,
  deleteWidget as deleteWidgetApi,
  getWidget as getWidgetApi,
  listWidgets as listWidgetsApi,
  myWidgetCount as myWidgetCountApi,
  updateWidget as updateWidgetApi,
  widgetStats as widgetStatsApi,
} from '#/generated/client'
import { queryKeys } from '#/lib/query-keys'

export function useWidgets(request?: ListWidgetsQuery, options?: { enabled?: boolean }) {
  return useQuery({
    enabled: options?.enabled ?? true,
    queryFn: () => listWidgetsApi({ query: request }),
    queryKey: queryKeys.widgets.list(request),
  })
}

export function useAdminWidgets(request?: AdminListWidgetsQuery, options?: { enabled?: boolean }) {
  return useQuery({
    enabled: options?.enabled ?? true,
    queryFn: () => adminListWidgetsApi({ query: request }),
    queryKey: queryKeys.widgets.adminList(request),
  })
}

export function useWidget(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    enabled: options?.enabled ?? Boolean(id),
    queryFn: () => getWidgetApi({ path: { id } }),
    queryKey: queryKeys.widgets.detail(id),
  })
}

export function useWidgetStats(options?: { enabled?: boolean }) {
  return useQuery({
    enabled: options?.enabled ?? true,
    queryFn: () => widgetStatsApi({}),
    queryKey: queryKeys.widgets.stats(),
  })
}

export function useMyWidgetCount(options?: { enabled?: boolean }) {
  return useQuery({
    enabled: options?.enabled ?? true,
    queryFn: () => myWidgetCountApi({}),
    queryKey: queryKeys.widgets.myCount(),
  })
}

export function useCreateWidget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: CreateWidget) => createWidgetApi({ body: request }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.widgets.all })
    },
  })
}

export function useUpdateWidget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: UpdateWidget }) =>
      updateWidgetApi({ body: request, path: { id } }),
    onSuccess: (widget, { id }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.widgets.all })
      queryClient.setQueryData(queryKeys.widgets.detail(id), widget)
    },
  })
}

export function useDeleteWidget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteWidgetApi({ path: { id } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.widgets.all })
    },
  })
}
