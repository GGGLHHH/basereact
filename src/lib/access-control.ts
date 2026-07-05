import { accessPolicies } from '#/generated/access-policies'

import type { StaticDataRouteOption } from '@tanstack/react-router'
import type { AccessPolicyKey, OperationAccessPolicy } from '#/generated/access-policies'

/**
 * 单个操作策略对有效权限集的判定,公式与 access-policies.ts 生成注释一致:
 * anyOf ? anyOf.some((group) => group.every(has)) : (permissions ?? []).every(has)。
 * public/authenticated 直接放行——能走到权限判定说明已过守卫的登录探针;
 * internal 拒绝(codegen 会滤掉,留作纵深防御)。
 */
export function isPolicyGranted(key: AccessPolicyKey, permissions: readonly string[]): boolean {
  // 显式拓宽:accessPolicies 是 as const 表,直接取 [key] 得到的联合类型上
  // 没法访问可选的 anyOf/permissions。
  const policy: OperationAccessPolicy = accessPolicies[key]

  if (policy.kind === 'internal') {
    return false
  }
  if (policy.kind !== 'permission') {
    return true
  }

  const has = (permission: string) => permissions.includes(permission)
  if (policy.anyOf) {
    return policy.anyOf.some((group) => group.every(has))
  }
  // fail closed:codegen 把"无需权限"的操作发成 kind:authenticated,所以
  // permission 却零 permissions 只可能是表被改坏——守卫路径宁拒不放。
  // (与生成注释的 `(permissions ?? []).every` 差在空集:那条公式给后端用,
  // 空集=不设限;前端准入闸取反义。)
  const required = policy.permissions ?? []
  return required.length > 0 && required.every(has)
}

/** 路由是否声明了权限准入(声明过才值得为它取权限集)。 */
export function declaresAccessPolicy(staticData: StaticDataRouteOption): boolean {
  return Boolean(staticData.accessPolicyKeys?.length || staticData.accessPolicyAnyOf?.length)
}

/**
 * 路由级判定,形状与 AccessPolicy 同构(见 types/route.d.ts):
 * accessPolicyKeys 全 AND,accessPolicyAnyOf 是 AND 组的 OR;无声明恒通过
 * (admin 区的登录/角色门在守卫探针,不在这里)。
 * 两字段文档上互斥,但类型不强制;并存时 AND 两侧(而非短路只认 anyOf、
 * 静默丢 keys),约束都生效,fail-safe 而非 fail-open。
 */
export function isStaticDataGranted(
  staticData: StaticDataRouteOption,
  permissions: readonly string[],
): boolean {
  const keysGranted = (staticData.accessPolicyKeys ?? []).every((key) =>
    isPolicyGranted(key, permissions),
  )
  const anyOfGranted =
    !staticData.accessPolicyAnyOf?.length ||
    staticData.accessPolicyAnyOf.some((group) =>
      group.every((key) => isPolicyGranted(key, permissions)),
    )
  return keysGranted && anyOfGranted
}
