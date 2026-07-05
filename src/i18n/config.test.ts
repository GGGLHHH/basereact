// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from 'vitest'

import { detectInitialLocale, LOCALE_STORAGE_KEY, normalizeLocale } from './config'

afterEach(() => {
  window.localStorage.clear()
})

describe('normalizeLocale', () => {
  it('keeps exact matches', () => {
    expect(normalizeLocale('zh-CN')).toBe('zh-CN')
    expect(normalizeLocale('en-US')).toBe('en-US')
  })

  it('falls back by language prefix', () => {
    expect(normalizeLocale('zh')).toBe('zh-CN')
    expect(normalizeLocale('zh-TW')).toBe('zh-CN')
    expect(normalizeLocale('en-GB')).toBe('en-US')
  })

  it('defaults on unknown or empty input', () => {
    expect(normalizeLocale('fr-FR')).toBe('en-US')
    expect(normalizeLocale(null)).toBe('en-US')
    expect(normalizeLocale(undefined)).toBe('en-US')
  })
})

describe('detectInitialLocale', () => {
  it('prefers a valid stored locale over navigator', () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'zh-CN')
    expect(detectInitialLocale()).toBe('zh-CN')
  })

  it('ignores garbage in storage and falls back to navigator normalization', () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'klingon')
    expect(detectInitialLocale()).toBe(normalizeLocale(navigator.language))
  })
})
