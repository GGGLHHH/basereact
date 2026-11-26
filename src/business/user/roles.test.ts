import { describe, expect, it } from 'vitest'

import {
  canManageAccount,
  canManageMember,
  holdsPlatformRole,
  PLATFORM_ROLE_NAMES,
  ROLE_LABEL_KEYS,
  ROLE_NAMES,
  rolesEditable,
} from './roles'

describe('platform-role account guards (mirror of the backend take-over guard)', () => {
  it('treats superadmin and platform_admin as platform roles, admin / user not', () => {
    expect(holdsPlatformRole(['superadmin'])).toBe(true)
    expect(holdsPlatformRole(['platform_admin'])).toBe(true)
    expect(holdsPlatformRole(['admin', 'user'])).toBe(false)
    expect(holdsPlatformRole([])).toBe(false)
  })

  it('only platform:roles can manage accounts that hold a platform role', () => {
    const platformAdmin = ['users:admin', 'tenants:admin']
    const superadmin = [...platformAdmin, 'ops:read', 'audit:read', 'platform:roles']
    for (const roles of [['superadmin'], ['platform_admin']] as const) {
      expect(canManageAccount({ roles: [...roles] }, platformAdmin)).toBe(false)
      expect(canManageAccount({ roles: [...roles] }, superadmin)).toBe(true)
    }
    expect(canManageAccount({ roles: [] }, platformAdmin)).toBe(true)
    // 权限还没加载(空集):持平台角色的账号先不给管(fail closed)
    expect(canManageAccount({ roles: ['platform_admin'] }, [])).toBe(false)
  })

  it('never offers role editing on the superadmin account', () => {
    expect(rolesEditable({ roles: ['superadmin'] })).toBe(false)
    expect(rolesEditable({ roles: ['platform_admin'] })).toBe(true)
  })

  it('gates org member actions on holds_platform_role the same way', () => {
    expect(canManageMember({ holds_platform_role: true }, ['members:admin'])).toBe(false)
    expect(canManageMember({ holds_platform_role: true }, ['members:admin', 'platform:roles'])).toBe(true)
    expect(canManageMember({ holds_platform_role: false }, ['members:admin'])).toBe(true)
  })

  it('offers every platform role as an account-list filter, independent of the grantable catalog', () => {
    expect(PLATFORM_ROLE_NAMES).toEqual(['superadmin', 'platform_admin'])
  })

  it('derives the role list for URL validation from the exhaustive label table', () => {
    expect([...ROLE_NAMES].sort()).toEqual(['admin', 'platform_admin', 'superadmin', 'user'])
    expect(Object.keys(ROLE_LABEL_KEYS)).toEqual(ROLE_NAMES)
  })
})
