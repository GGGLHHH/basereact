import { AudioLinesIcon, GalleryVerticalEndIcon, TerminalIcon } from '@gedatou/cadenza-icons'

/**
 * 品牌信息:侧边栏左上角的名称 / 图标(第一项是默认显示的)。
 *
 * **项目自己的文件**:从底座起的新项目改这里(和 i18n 里的 `appTitle`、`public/` 下的图标),
 * 别去改 app-sidebar.tsx —— 底座以后改侧边栏时,同步过来不会和项目的品牌改动冲突。
 */
export const BRAND_TEAMS = [
  {
    name: 'Acme Inc',
    logo: <GalleryVerticalEndIcon />,
    plan: 'Enterprise',
  },
  {
    name: 'Acme Corp.',
    logo: <AudioLinesIcon />,
    plan: 'Startup',
  },
  {
    name: 'Evil Corp.',
    logo: <TerminalIcon />,
    plan: 'Free',
  },
]
