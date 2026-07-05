import type { ToasterProps } from 'sonner'

import { Toaster as Sonner } from 'sonner'
import { useTheme } from 'next-themes'
import {
  IconAlertOctagon,
  IconAlertTriangle,
  IconCircleCheck,
  IconInfoCircle,
  IconLoader,
} from '@tabler/icons-react'

export function Toaster(props: ToasterProps) {
  const { theme = 'system' } = useTheme()

  return (
    <Sonner
      className='group'
      position='top-center'
      visibleToasts={5}
      duration={3000}
      icons={{
        success: <IconCircleCheck className='size-5' />,
        info: <IconInfoCircle className='size-5' />,
        warning: <IconAlertTriangle className='size-5' />,
        error: <IconAlertOctagon className='size-5' />,
        loading: <IconLoader className='size-5 animate-spin' />,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'transparent',
          '--border-radius': 'var(--radius)',
        } as React.CSSProperties
      }
      theme={theme as ToasterProps['theme']}
      toastOptions={{
        classNames: {
          // 图形约定:弹层用 popover 皮肤,无边、圆角、内边距 + 抬升阴影;图标 20x20 归零边距。
          toast:
            'cn-toast font-sans! text-popover-foreground text-sm! leading-[22px]! border-0! px-4! py-2! gap-2! shadow-lg!',
          icon: 'size-5! m-0! [&_svg]:m-0!',
        },
      }}
      {...props}
    />
  )
}
