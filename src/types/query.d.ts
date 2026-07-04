import type { ApiErrorClass } from '#/lib/api-client'

declare module '@tanstack/react-query' {
  interface Register {
    defaultError: ApiErrorClass
  }
}
