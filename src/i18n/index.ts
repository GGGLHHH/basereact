import type { ResourceLanguage } from 'i18next'

import i18next from 'i18next'
import resourcesToBackend from 'i18next-resources-to-backend'
import { initReactI18next } from 'react-i18next'

import {
  DEFAULT_LOCALE,
  normalizeLocale,
  persistLocale,
  SUPPORTED_LOCALES,
  syncHtmlLanguage,
} from './config'

const localeModules = import.meta.glob<{ default: ResourceLanguage }>('./locales/*/*.json')

async function loadLocaleResource(language: string, namespace: string): Promise<ResourceLanguage> {
  const moduleKey = `./locales/${normalizeLocale(language)}/${namespace}.json`
  const loader = localeModules[moduleKey]

  if (!loader) {
    throw new Error(`Missing locale resource: ${moduleKey}`)
  }

  const resourceModule = await loader()
  return resourceModule.default
}

// ponytail: 模块级单例。SSR 侧永远只渲染 DEFAULT_LOCALE(语言切换只发生在客户端
// hydration 之后,见 __root 的 LocaleSync),所以跨请求无语言泄漏;要按
// Accept-Language 出首屏时再改 per-request createInstance。
// 幂等:已初始化则不再 init(测试里 vitest-setup 先用内联 en 资源同步初始化了同一
// 单例;此处若再走异步 backend 会把同步资源清空,让 i18next.t() 退化成回显 key)。
if (!i18next.isInitialized) {
  void i18next
    .use(
      resourcesToBackend((language: string, namespace: string) =>
        loadLocaleResource(language, namespace),
      ),
    )
    .use(initReactI18next)
    .init({
      debug: import.meta.env.DEV && import.meta.env.MODE !== 'test',
      lng: DEFAULT_LOCALE,
      fallbackLng: DEFAULT_LOCALE,
      supportedLngs: SUPPORTED_LOCALES,
      load: 'currentOnly',
      defaultNS: 'common',
      ns: ['common', 'route'],
      interpolation: {
        // React 自己转义,i18next 再转义会把 & 之类双重编码
        escapeValue: false,
      },
      react: {
        // SSR 下不挂 Suspense:命名空间未就绪时先出 key 再水合,避免服务端悬挂
        useSuspense: false,
      },
    })
}

void i18next.on('languageChanged', (language) => {
  persistLocale(language)
  syncHtmlLanguage(language)
})

export default i18next
