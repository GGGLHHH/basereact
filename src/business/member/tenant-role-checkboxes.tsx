import type { TenantRoleName } from '@/generated/api-types'
import { Checkbox } from '@gedatou/cadenza-ui'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import { Field, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/field'

import { sortTenantRoles, TENANT_ROLE_LABEL_KEYS, TENANT_ROLES } from './tenant-roles'

interface TenantRoleCheckboxesProps {
  value: TenantRoleName[]
  onValueChange: (roles: TenantRoleName[]) => void
  onBlur?: () => void
  /** 已过门禁的错误(调用方用 cadenza-form 的 fieldErrors 取)。 */
  errors?: Array<{ message?: string } | undefined>
  disabled?: boolean
}

/**
 * 租户角色多选(闭集 admin / user,一个角色一个勾选框)。
 *
 * 受控、与表单库解耦:调用方在 form.Field 里把 value / onValueChange / errors 接上。
 * 布局按 writing-cadenza-forms 的「Checkbox 多选组」:FieldSet + FieldLegend(required 走
 * legend 的 prop),错误挂在组级;id 用 useId 前缀,同页多个实例不撞。
 */
export function TenantRoleCheckboxes({ value, onValueChange, onBlur, errors, disabled }: TenantRoleCheckboxesProps) {
  const { t } = useTranslation('common')
  const id = useId()
  const errorId = `${id}-error`
  const invalid = (errors ?? []).some(error => (error?.message ?? '') !== '')

  return (
    <FieldSet data-invalid={invalid || undefined}>
      <FieldLegend
        required
        variant='label'
      >
        {t('members.roles.legend')}
      </FieldLegend>
      <FieldGroup className='gap-2'>
        {TENANT_ROLES.map(role => (
          <Field
            key={role}
            orientation='horizontal'
          >
            <Checkbox
              aria-describedby={errorId}
              aria-invalid={invalid}
              checked={value.includes(role)}
              disabled={disabled}
              id={`${id}-${role}`}
              onBlur={onBlur}
              onCheckedChange={(checked) => {
                onValueChange(
                  checked ? sortTenantRoles([...value, role]) : value.filter(r => r !== role),
                )
              }}
            />
            <FieldLabel htmlFor={`${id}-${role}`}>{t(TENANT_ROLE_LABEL_KEYS[role])}</FieldLabel>
          </Field>
        ))}
      </FieldGroup>
      <FieldError
        errors={errors}
        id={errorId}
      />
    </FieldSet>
  )
}
