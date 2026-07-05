import type { RegisteredRouter } from '@tanstack/react-router'

// React 树外代码(api-client 的 401 跳转)拿 router 的句柄。
// SSR 每请求新建 router,只在浏览器登记;服务端恒为 null,
// 消费方必须可选链访问并自备兜底。
// RegisteredRouter 经 Register 接口解析到 getRouter 的真实类型,
// options.context 因此带完整类型,消费方无需 as。
export const globalRouter: { instance: RegisteredRouter | null } = {
  instance: null,
}
