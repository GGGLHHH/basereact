import '@tanstack/react-router'

import type { AccessPolicyKey } from '#/generated/access-policies'
import type route from '#/i18n/locales/en-US/route.json'

// route.json 拆两块:titles(页面/菜单标题)、menuGroups(菜单分组标签)。
// key 带对象前缀,消费端 t('titles.x') / t('menuGroups.x')。
type RouteTitleKey = `titles.${Extract<keyof (typeof route)['titles'], string>}`
type RouteGroupKey = `menuGroups.${Extract<keyof (typeof route)['menuGroups'], string>}`

declare module '@tanstack/react-router' {
  interface StaticDataRouteOption {
    // 路由准入按 codegen 的操作策略走,key 指向 accessPolicies 表项,
    // 形状与 AccessPolicy 同构(permissions/anyOf),判定公式一致:
    //   accessPolicyAnyOf ? anyOf.some((group) => group.every(granted))
    //                     : (accessPolicyKeys ?? []).every(granted)
    // 单个 key 授权与否由该操作自身策略(permissions AND / anyOf)决定。
    /** 全部需通过(AND)。给了 accessPolicyAnyOf 时不要再给这个。 */
    accessPolicyKeys?: readonly AccessPolicyKey[]
    /** AND 组的 OR:任一组全过即放行。 */
    accessPolicyAnyOf?: readonly (readonly AccessPolicyKey[])[]
    // 匿名访问显式白名单。无任何 access 元数据的路由按拒绝处理(fail closed)。
    accessPublic?: boolean
    // 菜单/面包屑元数据。嵌套路由继承由消费端(菜单树)决定,类型层不强约束。
    // *Key 指向 route 命名空间,编译期对 en-US 基准 key 检查;硬编码 title 仅
    // 留给不进翻译的路由(调试页等),两者都给时 Key 优先。
    titleKey?: RouteTitleKey
    menuTitleKey?: RouteTitleKey
    title?: string
    subtitle?: string
    menuTitle?: string
    icon?: string
    groupKey?: RouteGroupKey
    order?: number
    hideInMenu?: boolean
  }
}
