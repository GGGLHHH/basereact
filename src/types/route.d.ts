import '@tanstack/react-router'

import type { AccessPolicyKey } from '#/generated/access-policies'

declare module '@tanstack/react-router' {
  interface StaticDataRouteOption {
    // 路由准入按 codegen 的操作策略走:key 指向 accessPolicies 表项,
    // kind=permission 时以该操作声明的 permissions 判定。
    accessPolicyKey?: AccessPolicyKey
    // 匿名访问显式白名单。无任何 access 元数据的路由按拒绝处理(fail closed)。
    accessPublic?: boolean
    // 菜单/面包屑元数据。嵌套路由继承由消费端(菜单树)决定,类型层不强约束。
    title?: string
    subtitle?: string
    menuTitle?: string
    icon?: string
    group?: string
    order?: number
    hideInMenu?: boolean
  }
}
