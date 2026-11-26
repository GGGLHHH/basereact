import { GalleryVerticalEndIcon } from '@gedatou/cadenza-icons'

/**
 * 品牌信息:侧边栏左上角的名称 / 图标 / 副标题。
 *
 * **项目自己的文件**:从底座起的新项目改这里(和 i18n 里的 `appTitle`、`public/` 下的图标),
 * 别去改 app-sidebar.tsx / team-switcher.tsx —— 底座以后改侧边栏时,同步过来不会和项目的品牌改动冲突。
 *
 * 只有一个租户(单租户项目)时侧栏左上角就显示这里;账号属于 ≥ 2 个租户时那一格变成租户切换器,
 * 图标仍用这里的 `logo`,名称换成当前租户名、副标题换成品牌名。
 */
export const BRAND = {
  name: 'Acme Inc',
  logo: <GalleryVerticalEndIcon />,
  tagline: 'Enterprise',
}
