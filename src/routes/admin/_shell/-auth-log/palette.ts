// 视觉编码:把认证事件映射成"色调 + 字形 + 文案键"。颜色按**安全重要性**编码,不是装饰——
// fail(红)= 你盯着的;warn(琥珀)= 可疑(凭据对但越权);accent(紫)= 安全敏感;
// success(绿)= 正常准入;muted = 例行生命周期。tape/图/表共用这一张表,读者学一次到处认。

import type { ParseKeys } from 'i18next'

import type { AuthEventType, FailureReason, Tone } from './types'

// common 命名空间的合法翻译键(编译期查错字);与 app 的 RouteTitleKey 同范式。
type CommonKey = ParseKeys<'common'>

// 色调 → CSS 变量(tokens.css 的数据层)。图表/内联样式都引这个,主题自适应。
export const TONE_VAR: Record<Tone, string> = {
  success: 'var(--auth-success)',
  fail: 'var(--auth-fail)',
  warn: 'var(--auth-warn)',
  accent: 'var(--auth-accent)',
  muted: 'var(--muted-foreground)',
}

// 状态字形(mono tape 用;终端质感,非 icon 组件)。
export const TONE_GLYPH: Record<Tone, string> = {
  success: '✓',
  fail: '✕',
  warn: '!',
  accent: '◆',
  muted: '·',
}

export interface EventMeta {
  tone: Tone
  /** common.json 下 authLog.events.* 的键。 */
  labelKey: CommonKey
}

// 键 = 后端 AuthEventType union(带 `auth.` 前缀)。Record<AuthEventType> 强制 exhaustive:
// 缺一个键编译不过 —— 后端加事件类型 → regen → 这里必须补,漂移构建期抓。
export const EVENT_META: Record<AuthEventType, EventMeta> = {
  'auth.login_succeeded': { tone: 'success', labelKey: 'authLog.events.loginSucceeded' },
  'auth.registered': { tone: 'success', labelKey: 'authLog.events.registered' },
  'auth.login_failed': { tone: 'fail', labelKey: 'authLog.events.loginFailed' },
  'auth.admin_access_denied': { tone: 'warn', labelKey: 'authLog.events.adminAccessDenied' },
  'auth.password_changed': { tone: 'accent', labelKey: 'authLog.events.passwordChanged' },
  'auth.refreshed': { tone: 'muted', labelKey: 'authLog.events.refreshed' },
  'auth.logged_out': { tone: 'muted', labelKey: 'authLog.events.loggedOut' },
  'auth.logout_all': { tone: 'muted', labelKey: 'authLog.events.logoutAll' },
  'auth.account_deleted': { tone: 'warn', labelKey: 'authLog.events.accountDeleted' },
}

export const REASON_LABEL_KEY: Record<FailureReason, CommonKey> = {
  unknown_user: 'authLog.reasons.unknownUser',
  bad_password: 'authLog.reasons.badPassword',
  no_admin_perm: 'authLog.reasons.noAdminPerm',
  account_locked: 'authLog.reasons.accountLocked',
  rate_limited: 'authLog.reasons.rateLimited',
}

export function toneOf(eventType: AuthEventType): Tone {
  return EVENT_META[eventType].tone
}
