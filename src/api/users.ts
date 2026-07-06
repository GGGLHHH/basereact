import { useQuery } from '@tanstack/react-query'

import type { ListUsersQuery } from '#/generated/api-types'
import { listUsers as listUsersApi } from '#/generated/client'
import { queryKeys } from '#/lib/query-keys'

export function useUsers(request?: ListUsersQuery, options?: { enabled?: boolean }) {
  return useQuery({
    enabled: options?.enabled ?? true,
    queryFn: () => listUsersApi({ query: request }),
    queryKey: queryKeys.users.list(request),
  })
}
