import type common from '@/i18n/locales/en-US/common.json'
import type route from '@/i18n/locales/en-US/route.json'

// en-US 是基准语言:key 类型从它推导,t() 的 key 编译期检查。
// zh-CN 只在运行时按 key 取值,缺 key 编译期查不出(目前也没有脚本校验两份 key 是否一致)。
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: {
      common: typeof common
      route: typeof route
    }
  }
}
