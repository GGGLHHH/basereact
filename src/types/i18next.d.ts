import type common from '#/i18n/locales/en-US/common.json'
import type route from '#/i18n/locales/en-US/route.json'

// en-US 是基准语言:key 类型从它推导,t() 的 key 编译期检查。
// zh-CN 缺 key 由 scripts 层校验(要时搬 xchangeai 的 check-i18n-keys)。
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: {
      common: typeof common
      route: typeof route
    }
  }
}
