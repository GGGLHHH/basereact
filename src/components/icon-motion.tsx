import type { ComponentType, ReactElement, Ref } from 'react'
import { AnimateIcon } from '@gedatou/cadenza-icons'
import { useEffect, useRef, useState } from 'react'

/**
 * 图标一律用 @gedatou/cadenza-icons 的动画图标,播放时机全站统一:
 *
 * - 可交互的整行 / 按钮(侧栏菜单、下拉菜单项、操作按钮):悬停整个元素时播放
 *   里面的图标 —— 用 PlayOnHover 包住这个元素,图标本身不写触发。
 * - 一次性的状态提示(toast、下拉里当前项的 ✓):出现时播一遍,图标上写 `animate`。
 * - 进行中(加载):一直循环,`animate loop`。
 * - 页面里的说明性徽标:进入视口播一遍,`animateOnView`。
 * - 纯展示的小徽章(表格里的角色、验证状态):只在悬停那个徽章时播,密集列表里
 *   不让整屏图标一起动。
 *
 * 系统开了「减少动画」时 animate-ui 自己不播,这里不用另外判断。
 */
export function PlayOnHover({ children }: { children: ReactElement }): ReactElement {
  return (
    <AnimateIcon
      animateOnHover
      asChild
    >
      {children}
    </AnimateIcon>
  )
}

interface HostHoverIconProps {
  icon: ComponentType<{ animate?: boolean, className?: string, ref?: Ref<SVGSVGElement> }>
  className?: string
}

/**
 * PlayOnHover 包不了的时候用:按钮本身是别的组件的触发器子元素(如 cadenza 的
 * InfiniteSelect 把第一个子元素当触发器,外面多包一层就接不上)。图标自己跟着
 * 最近的按钮 / 链接的悬停播放,效果和 PlayOnHover 一样。
 */
export function HostHoverIcon({ icon: Icon, className }: HostHoverIconProps): ReactElement {
  const ref = useRef<SVGSVGElement>(null)
  const [hovered, setHovered] = useState(false)
  useEffect(() => {
    const host = ref.current?.closest<HTMLElement>('button, a, [role="button"]')
    if (!host) {
      return
    }
    const enter = (event: PointerEvent): void => {
      if (event.pointerType !== 'touch') {
        setHovered(true)
      }
    }
    const leave = (): void => setHovered(false)
    host.addEventListener('pointerenter', enter)
    host.addEventListener('pointerleave', leave)
    return () => {
      host.removeEventListener('pointerenter', enter)
      host.removeEventListener('pointerleave', leave)
    }
  }, [])
  return (
    <Icon
      animate={hovered}
      className={className}
      ref={ref}
    />
  )
}
