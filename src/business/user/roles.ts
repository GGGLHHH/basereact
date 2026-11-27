import type { AdminUserView, MemberView, Perm, RoleName } from '@/generated/api-types'

// 角色闭集的显示名 key(Record<RoleName, …> 穷尽:后端加角色、前端不补这里 = 编译错,不会静默显示机器码)。
// 平台角色走 users.roles.*,组织角色复用成员页的 members.roles.*。
export const ROLE_LABEL_KEYS = {
  superadmin: 'users.roles.superadmin',
  platform_admin: 'users.roles.platform_admin',
  admin: 'members.roles.admin',
  user: 'members.roles.user',
} as const satisfies Record<RoleName, string>

// 角色闭集的取值(给 URL search 的 zod 校验用),从上面的穷尽表派生,不手写第二份 union。
export const ROLE_NAMES = Object.keys(ROLE_LABEL_KEYS) as [RoleName, ...RoleName[]]

// 哪些是平台角色(与后端 RoleName::scope 对齐;穷尽表,加角色必须表态)。
const IS_PLATFORM_ROLE = {
  superadmin: true,
  platform_admin: true,
  admin: false,
  user: false,
} as const satisfies Record<RoleName, boolean>

/** 平台角色闭集(账号列表的角色列 / 角色筛选的候选:全部平台角色,不看能不能授出)。 */
export const PLATFORM_ROLE_NAMES: RoleName[] = ROLE_NAMES.filter(role => IS_PLATFORM_ROLE[role])

/** 管理持平台角色的账号所需的权限(superadmin 独占)。 */
const PLATFORM_ROLES_PERM = 'platform:roles' satisfies Perm

/** 账号持有任一平台角色(superadmin / 平台管理员)。 */
export function holdsPlatformRole(roles: readonly RoleName[]): boolean {
  return roles.some(role => IS_PLATFORM_ROLE[role])
}

/**
 * 当前操作者能不能对这个账号做账号管理写操作(编辑 / 删除 / 重置密码 / 改角色)。
 * 持平台角色的账号只有 platform:roles(superadmin)能管 —— 按钮显隐用,后端兜底 403。
 * permissions 未加载(空集)时按没有处理(fail closed)。
 */
export function canManageAccount(
  target: Pick<AdminUserView, 'roles'>,
  permissions: readonly string[],
): boolean {
  return !holdsPlatformRole(target.roles) || permissions.includes(PLATFORM_ROLES_PERM)
}

/**
 * 能不能在组织里改这个成员的角色 / 移出他:成员持平台角色(后端 `holds_platform_role`,看原始角色名)时
 * 只有 platform:roles 能动。按钮显隐用,后端兜底 403。
 */
export function canManageMember(
  member: Pick<MemberView, 'holds_platform_role'>,
  permissions: readonly string[],
): boolean {
  return !member.holds_platform_role || permissions.includes(PLATFORM_ROLES_PERM)
}

/** superadmin 的角色不经任何接口改动(只由 seed 声明):它的「角色」区不出现。 */
export function rolesEditable(target: Pick<AdminUserView, 'roles'>): boolean {
  return !target.roles.includes('superadmin')
}
