import type { TenantRoleName } from '@/generated/api-types'

// 租户角色闭集的展示顺序(权限从大到小)。勾选框、徽章、提交值都按它排,结果与点击顺序无关。
export const TENANT_ROLES = ['admin', 'user'] as const satisfies readonly TenantRoleName[]

export const TENANT_ROLE_LABEL_KEYS = {
  admin: 'members.roles.admin',
  user: 'members.roles.user',
} as const satisfies Record<TenantRoleName, string>

/** 按 TENANT_ROLES 的顺序排好、去重。 */
export function sortTenantRoles(roles: readonly TenantRoleName[]): TenantRoleName[] {
  return TENANT_ROLES.filter(role => roles.includes(role))
}
