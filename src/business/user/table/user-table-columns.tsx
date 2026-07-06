import { createColumnHelper } from '@tanstack/react-table'

import type { TFunction } from 'i18next'
import type { ColumnDef } from '@tanstack/react-table'
import type { AdminUserView } from '#/generated/api-types'

import { dash } from '@/business/common'
import { formatDateTime } from '@/lib/datetime'

const columnHelper = createColumnHelper<AdminUserView>()

export type UserColumnDef = ColumnDef<AdminUserView, any>

// 原样展示 AdminUserView 全字段;后续要排序/筛选/操作列时,在这里按 widgets 之外补 header/cell。
export function createUserColumns(t: TFunction<'common'>): UserColumnDef[] {
  return [
    columnHelper.accessor('id', { header: t('users.columns.id') }),
    columnHelper.accessor('username', { header: t('users.columns.username') }),
    columnHelper.accessor('email', {
      header: t('users.columns.email'),
      cell: ({ getValue }) => dash(getValue()),
    }),
    columnHelper.accessor('display_name', {
      header: t('users.columns.displayName'),
      cell: ({ getValue }) => dash(getValue()),
    }),
    columnHelper.accessor('avatar_url', {
      header: t('users.columns.avatarUrl'),
      cell: ({ getValue }) => dash(getValue()),
    }),
    columnHelper.accessor('email_verified', {
      header: t('users.columns.emailVerified'),
      cell: ({ getValue }) => String(getValue()),
    }),
    columnHelper.accessor('roles', {
      header: t('users.columns.roles'),
      cell: ({ getValue }) => getValue().join(', ') || '—',
    }),
    columnHelper.accessor('created_at', {
      header: t('users.columns.createdAt'),
      cell: ({ getValue }) => formatDateTime(getValue()),
    }),
  ]
}
