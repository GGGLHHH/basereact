import { useTranslation } from 'react-i18next'
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts'

import type { ChartConfig } from '@/components/ui/chart'
import type { HourBucket } from './types'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'

import { hm } from './format'

export function ActivityChart({ data }: { data: HourBucket[] }) {
  const { t } = useTranslation('common')

  const config = {
    success: { label: t('authLog.chart.success'), color: 'var(--auth-success)' },
    failure: { label: t('authLog.chart.failure'), color: 'var(--auth-fail)' },
  } satisfies ChartConfig

  return (
    <Card className='gap-3'>
      <CardHeader className='pb-0'>
        <CardTitle className='flex items-baseline justify-between text-sm font-medium'>
          <span>{t('authLog.chart.activityTitle')}</span>
          <span className='text-xs font-normal text-muted-foreground'>{t('authLog.window')}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className='pt-0'>
        <ChartContainer
          config={config}
          className='aspect-auto! h-66 w-full'
        >
          <AreaChart
            data={data}
            margin={{ left: 4, right: 4, top: 8 }}
          >
            <defs>
              <linearGradient
                id='fill-success'
                x1='0'
                y1='0'
                x2='0'
                y2='1'
              >
                <stop
                  offset='0%'
                  stopColor='var(--color-success)'
                  stopOpacity={0.5}
                />
                <stop
                  offset='100%'
                  stopColor='var(--color-success)'
                  stopOpacity={0.04}
                />
              </linearGradient>
              <linearGradient
                id='fill-failure'
                x1='0'
                y1='0'
                x2='0'
                y2='1'
              >
                <stop
                  offset='0%'
                  stopColor='var(--color-failure)'
                  stopOpacity={0.6}
                />
                <stop
                  offset='100%'
                  stopColor='var(--color-failure)'
                  stopOpacity={0.05}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              strokeDasharray='2 4'
            />
            <XAxis
              dataKey='t'
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={40}
              tickFormatter={hm}
              className='font-mono text-[0.65rem]'
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(v) => hm(String(v))}
                  className='font-mono'
                />
              }
            />
            {/* 失败在下(贴底、显眼),成功堆其上 —— 失败带是你要盯的信号。 */}
            <Area
              dataKey='failure'
              type='monotone'
              stackId='a'
              stroke='var(--color-failure)'
              fill='url(#fill-failure)'
              strokeWidth={1.5}
            />
            <Area
              dataKey='success'
              type='monotone'
              stackId='a'
              stroke='var(--color-success)'
              fill='url(#fill-success)'
              strokeWidth={1.5}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
