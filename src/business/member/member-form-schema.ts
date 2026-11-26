import type { TFunction } from 'i18next'
import { z } from 'zod'

import { TENANT_ROLES } from './tenant-roles'

/** 租户角色字段的校验:至少一个(空角色的成员什么都做不了,多半是误操作)。 */
export function tenantRolesSchema(t: TFunction<'common'>) {
  return z.array(z.enum(TENANT_ROLES)).min(1, t('members.roles.required'))
}
