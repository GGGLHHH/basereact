import type { InstanceReport } from '@/generated/api-types'

import { Badge } from '@gedatou/cadenza-ui'
import { useTranslation } from 'react-i18next'

import { Card } from '@/components/ui/card'

import { duration, hms } from './format'
import { instanceHealth } from './health'
import { HealthDot, StatusMark } from './status'

/** 进程概况:角色 / 版本 / 运行时长 + 每项依赖的检查结果。 */
export function InstanceHeader({ instance }: { instance: InstanceReport }) {
  const { t } = useTranslation('common')
  const health = instanceHealth(instance)

  if (!instance.reachable) {
    return (
      <Card className='flex-row items-center gap-3 p-4'>
        <HealthDot health='down' />
        <span className='text-sm font-medium'>{t(`monitoring.roles.${instance.role}`)}</span>
        <StatusMark
          health='down'
          label={t('monitoring.instance.unreachable', { reason: instance.error ?? '' })}
        />
      </Card>
    )
  }

  return (
    <Card className='gap-4 p-4'>
      <div className='flex flex-wrap items-center gap-x-6 gap-y-2'>
        <div className='flex items-center gap-2'>
          <HealthDot health={health} />
          <span className='text-sm font-semibold'>{t(`monitoring.roles.${instance.role}`)}</span>
          <StatusMark
            health={health}
            label={t(`monitoring.health.${health}`)}
          />
        </div>
        <Meta
          label={t('monitoring.instance.version')}
          value={instance.version}
        />
        <Meta
          label={t('monitoring.instance.uptime')}
          value={duration(instance.uptime_secs)}
        />
        {instance.started_at != null
          ? (
              <Meta
                label={t('monitoring.instance.started')}
                value={hms(instance.started_at)}
              />
            )
          : null}
        <Meta
          label={t('monitoring.instance.window')}
          value={duration(instance.window_secs)}
        />
      </div>

      <div className='flex flex-wrap items-center gap-2'>
        <span className='mr-1 text-xs text-muted-foreground'>{t('monitoring.deps.title')}</span>
        {instance.checks.length === 0
          ? <span className='text-xs text-muted-foreground'>{t('monitoring.deps.none')}</span>
          : instance.checks.map(c => (
              <Badge
                key={c.name}
                variant='outline'
                title={c.error ?? undefined}
                className='gap-2'
              >
                <span className='font-mono text-xs'>{c.name}</span>
                <StatusMark
                  health={c.ok ? 'ok' : 'down'}
                  label={c.ok ? `${c.latency_ms} ms` : t('monitoring.deps.down')}
                />
              </Badge>
            ))}
      </div>
    </Card>
  )
}

function Meta({ label, value }: { label: string, value: string }) {
  return (
    <span className='flex items-baseline gap-1.5 text-xs'>
      <span className='text-muted-foreground'>{label}</span>
      <span className='font-mono'>{value}</span>
    </span>
  )
}
