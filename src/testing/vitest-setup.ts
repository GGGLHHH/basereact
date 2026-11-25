import type { InitOptions } from 'i18next'
import i18next from 'i18next'
import { MotionGlobalConfig } from 'motion/react'
import { initReactI18next } from 'react-i18next'

import common from '@/i18n/locales/en-US/common.json'
import route from '@/i18n/locales/en-US/route.json'

// DOM test environments may lack the Web Animations API. Base UI components call
// element.getAnimations() to coordinate enter/exit transitions; stub it to avoid
// "getAnimations is not a function" in component tests. Guarded for
// node-environment test files where Element is undefined.
if (typeof Element !== 'undefined' && typeof Element.prototype.getAnimations !== 'function') {
  Element.prototype.getAnimations = () => []
}

// cadenza 0.9 起弹层/按钮动效走 animate-ui(底层 motion)。happy-dom 实现了 WAAPI,
// motion 会真的起原生动画;组件卸载时 motion 调 Animation.cancel(),happy-dom 按规范
// 让 finished promise 以 AbortError 拒绝,没人接 → 一串 Unhandled Rejection。
// motion 自带的测试开关让所有动画立即完成,不再起原生动画,也不会被中途取消。
// basereact 与 cadenza-ui / animate-ui 共用同一份 motion(pnpm why motion 只有一个
// 版本),开关能作用到库里的组件;两边 motion 版本分叉时此处会失效,要一起升。
MotionGlobalConfig.skipAnimations = true

// animate-ui 有几处(选项高亮滑块、选中值切换)不经 motion、直接调 Element.animate。
// 组件卸载时它 cancel() 动画:规范要求 finished promise 以 AbortError 拒绝并「标记为已处理」,
// 浏览器因此不报错;happy-dom 只拒绝不标记,于是冒成 Unhandled Rejection。
// 这里补上规范里那一步:cancel 前给当前 finished 挂个空 catch。只影响测试环境。
const AnimationCtor = (globalThis as { Animation?: typeof Animation }).Animation
if (AnimationCtor) {
  const proto = AnimationCtor.prototype
  const nativeCancel = Object.getOwnPropertyDescriptor(proto, 'cancel')?.value as (this: Animation) => void
  proto.cancel = function (this: Animation) {
    this.finished.catch(() => {})
    nativeCancel.call(this)
  }
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
