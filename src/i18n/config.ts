export const LOCALE_STORAGE_KEY = 'basereact.locale'

export const SUPPORTED_LOCALES = ['en-US', 'zh-CN'] as const

export type AppLocale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: AppLocale = 'en-US'

// 精确命中优先,退语言前缀(zh-TW 归 zh-CN,en-GB 归 en-US),再退默认。
export function normalizeLocale(locale?: string | null): AppLocale {
  if (!locale) {
    return DEFAULT_LOCALE
  }

  const exact = SUPPORTED_LOCALES.find((candidate) => candidate === locale)
  if (exact) {
    return exact
  }

  const language = locale.toLowerCase().split('-')[0]
  const byLanguage = SUPPORTED_LOCALES.find((candidate) =>
    candidate.toLowerCase().startsWith(`${language}-`),
  )
  return byLanguage ?? DEFAULT_LOCALE
}

export function isSupportedLocale(locale: string): locale is AppLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(locale)
}

export function detectInitialLocale(): AppLocale {
  if (typeof window === 'undefined') {
    return DEFAULT_LOCALE
  }

  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY)
    if (stored && isSupportedLocale(stored)) {
      return stored
    }
  } catch {
    // localStorage 不可用(隐私模式)时静默走浏览器语言
  }

  const browserLocales = navigator.languages?.length ? navigator.languages : [navigator.language]
  for (const locale of browserLocales) {
    if (locale) {
      return normalizeLocale(locale)
    }
  }

  return DEFAULT_LOCALE
}

export function persistLocale(locale: string | null | undefined) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, normalizeLocale(locale))
  } catch {}
}

export function syncHtmlLanguage(locale: string | null | undefined) {
  if (typeof document === 'undefined') {
    return
  }

  document.documentElement.lang = normalizeLocale(locale)
}
