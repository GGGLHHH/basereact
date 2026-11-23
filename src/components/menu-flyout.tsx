import type { TFunction } from 'i18next'
import type { AdminMenuEntry } from '@/lib/route-menu'
import { DropdownMenuItem, DropdownMenuSubmenu, DropdownMenuSubmenuPopup, DropdownMenuSubmenuTrigger } from '@gedatou/cadenza-ui'
import { Link } from '@tanstack/react-router'
import { PlayOnHover } from '@/components/icon-motion'
import { cn } from '@/lib/utils'

// 菜单树的两处弹出式渲染共用这里:侧栏收起态的飞出层(app-sidebar),和面包屑里
// 纯分组那一级的下拉(-shell-layout)。两处长得一样、行为一样。

// 路由 staticData.icon 给的动画图标。不单独挂触发:外层整行的 PlayOnHover 悬停时
// 一起播放(折叠箭头同理)。显式 size-4 shrink-0,收起(icon 模式)时不被压变形。
export function MenuIcon({ icon: Icon }: { icon?: AdminMenuEntry['icon'] }) {
  return Icon ? <Icon className='size-4 shrink-0' /> : null
}

// 飞出层:叶子=Link 直达,
// 含子=递归 DropdownMenuSubmenu,多级也能点到任意子页。飞出层用 vendored ui/dropdown-menu
// (块流,不加容器间距);项间缝由下面的 pill 内缩给。
//
// 飞出项高亮走内缩 ::before pill:pill 四周都内缩(inset-x-1 + inset-y-0.5),相邻两项的
// 高亮之间自带缝,故 hover 与激活不贴死——且**容器不加任何间距**(gap/space-y 对 Base UI
// 弹层脆:submenu 开合会增删父层子元素,容器间距随之抖动)。z-0 让 item 成层叠上下文,
// pill(-z-10)沉到文字下、popup 背景上。满盒 bg 用 ! 顶掉(与展开态 highlightProps 同一手法)。
const FLYOUT_PILL
  = 'z-0 before:absolute before:inset-x-1 before:inset-y-0.5 before:-z-10 before:rounded-sm before:content-[\'\']'
// 叶子/自身项:hover 画 accent pill(顶掉 focus:bg-accent 满盒)。
const FLYOUT_ITEM_CLASS = `${FLYOUT_PILL} focus:bg-transparent! focus:before:bg-accent`
// 有子项的 SubTrigger:另带 data-open / data-popup-open 满盒 bg,一并顶掉再画 pill。
const FLYOUT_TRIGGER_CLASS = `${FLYOUT_PILL} focus:bg-transparent! data-open:bg-transparent! data-popup-open:bg-transparent! focus:before:bg-accent data-open:before:bg-accent data-popup-open:before:bg-accent`
// 激活项:常驻 sidebar-accent pill + 前景色(与展开侧栏一致)。
const FLYOUT_ACTIVE_PILL = 'text-sidebar-accent-foreground before:bg-sidebar-accent'

export function FlyoutMenuNode({
  node,
  pathname,
  t,
}: {
  node: AdminMenuEntry
  pathname: string
  t: TFunction<'route'>
}) {
  const label = node.labelKey ? t(node.labelKey) : node.label
  const isActive = pathname === node.url || pathname.startsWith(`${node.url}/`)
  if (node.children.length === 0) {
    return (
      <PlayOnHover>
        <DropdownMenuItem
          render={<Link to={node.url} />}
          className={cn(FLYOUT_ITEM_CLASS, isActive && FLYOUT_ACTIVE_PILL)}
        >
          <MenuIcon icon={node.icon} />
          <span className='group-data-[collapsible=icon]:sr-only'>{label}</span>
        </DropdownMenuItem>
      </PlayOnHover>
    )
  }
  return (
    <DropdownMenuSubmenu>
      <DropdownMenuSubmenuTrigger className={cn(FLYOUT_TRIGGER_CLASS, isActive && FLYOUT_ACTIVE_PILL)}>
        <MenuIcon icon={node.icon} />
        <span className='group-data-[collapsible=icon]:sr-only'>{label}</span>
      </DropdownMenuSubmenuTrigger>
      <DropdownMenuSubmenuPopup>
        {node.children.map(child => (
          <FlyoutMenuNode
            key={child.url}
            node={child}
            pathname={pathname}
            t={t}
          />
        ))}
      </DropdownMenuSubmenuPopup>
    </DropdownMenuSubmenu>
  )
}
