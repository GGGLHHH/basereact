import { describe, expect, it } from 'vitest'

import { declaresAccessPolicy, isPolicyGranted, isStaticDataGranted } from './access-control'

// 直接吃真实生成表:purgePreview = permissions AND(widgets:read + widgets:delete),
// widgetOverview = anyOf([[widgets:read],[users:admin]]),getMe = authenticated。
// 表若重新生成导致条目语义变化,这里编译期/断言就会暴露。
describe('isPolicyGranted', () => {
  it('requires every permission for an AND policy', () => {
    expect(isPolicyGranted('purgePreview', ['widgets:read', 'widgets:delete'])).toBe(true)
    expect(isPolicyGranted('purgePreview', ['widgets:read'])).toBe(false)
  })

  it('grants an anyOf policy when any group is fully held', () => {
    expect(isPolicyGranted('widgetOverview', ['users:admin'])).toBe(true)
    expect(isPolicyGranted('widgetOverview', ['widgets:read'])).toBe(true)
    expect(isPolicyGranted('widgetOverview', ['widgets:write'])).toBe(false)
  })

  it('always grants authenticated-kind policies', () => {
    // 登录探针在守卫层已过,authenticated 操作不看权限集。
    expect(isPolicyGranted('getMe', [])).toBe(true)
  })
})

describe('isStaticDataGranted', () => {
  it('passes routes without any access declaration', () => {
    expect(declaresAccessPolicy({})).toBe(false)
    expect(isStaticDataGranted({}, [])).toBe(true)
  })

  it('ANDs accessPolicyKeys', () => {
    const staticData = { accessPolicyKeys: ['adminListWidgets', 'purgePreview'] as const }
    expect(declaresAccessPolicy(staticData)).toBe(true)
    expect(isStaticDataGranted(staticData, ['users:admin', 'widgets:read', 'widgets:delete'])).toBe(
      true,
    )
    expect(isStaticDataGranted(staticData, ['users:admin'])).toBe(false)
  })

  it('ORs accessPolicyAnyOf groups', () => {
    const staticData = {
      accessPolicyAnyOf: [['adminListWidgets'], ['listWidgets']] as const,
    }
    expect(isStaticDataGranted(staticData, ['widgets:read'])).toBe(true)
    expect(isStaticDataGranted(staticData, ['users:admin'])).toBe(true)
    expect(isStaticDataGranted(staticData, ['contents:read'])).toBe(false)
  })

  it('ANDs both fields when a route declares keys and anyOf together', () => {
    // 文档上互斥,但类型不强制;并存时两约束都要过(不短路丢 keys)。
    const staticData = {
      accessPolicyAnyOf: [['listWidgets']] as const,
      accessPolicyKeys: ['purgePreview'] as const,
    }
    // anyOf 组过(widgets:read)但 keys 未过(缺 widgets:delete)→ 拒。
    expect(isStaticDataGranted(staticData, ['widgets:read'])).toBe(false)
    // 两侧都过 → 放行。
    expect(isStaticDataGranted(staticData, ['widgets:read', 'widgets:delete'])).toBe(true)
  })
})
