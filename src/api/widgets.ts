import type { ListWidgetsQuery } from '@/generated/api-types'

import { useQuery } from '@tanstack/react-query'
import { listWidgets as listWidgetsApi } from '@/generated/client'
import { queryKeys } from '@/lib/query-keys'

export function useWidgets(request?: ListWidgetsQuery, options?: { enabled?: boolean }) {
  return useQuery({
    enabled: options?.enabled ?? true,
    queryFn: () => listWidgetsApi({ query: request }),
    queryKey: queryKeys.widgets.list(request),
  })
}
