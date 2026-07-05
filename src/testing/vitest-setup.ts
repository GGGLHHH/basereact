import i18next, { type InitOptions } from 'i18next'
import { initReactI18next } from 'react-i18next'

import common from '#/i18n/locales/en-US/common.json'
import route from '#/i18n/locales/en-US/route.json'

// DOM test environments may lack the Web Animations API. Base UI components call
// element.getAnimations() to coordinate enter/exit transitions; stub it to avoid
// "getAnimations is not a function" in component tests. Guarded for
// node-environment test files where Element is undefined.
if (typeof Element !== 'undefined' && typeof Element.prototype.getAnimations !== 'function') {
  Element.prototype.getAnimations = () => []
}

// 组件测试用的同步 i18n:内联真实 en 资源(不走 index.ts 的异步 glob backend),
// 首帧即出英文文案,断言按可读文本查询即可。复用真实 locale 文件 —— 组件改了 key
// 却忘同步资源时,依赖文案的测试会直接挂,起防漂移作用。
// initImmediate:false —— 资源内联,让 store 同步就绪,模块级 i18next.t()(route-menu
// 分组名、use-content-upload 错误文案)首个同步调用即返回译文(该项运行时有效,
// 但类型 InitOptions 未收录,故整体 cast)。
void i18next.use(initReactI18next).init({
  defaultNS: 'common',
  fallbackLng: 'en',
  initImmediate: false,
  interpolation: { escapeValue: false },
  lng: 'en',
  ns: ['common', 'route'],
  react: { useSuspense: false },
  resources: { en: { common, route } },
} as InitOptions)
