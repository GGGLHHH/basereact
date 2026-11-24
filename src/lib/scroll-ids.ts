/** 后台主内容区滚动容器的标识(`data-scroll-restoration-id`):路由按它还原 / 回顶滚动位置。 */
export const ADMIN_SCROLL_ID = 'admin-main'

/** router 的 scrollToTopSelectors 用:新导航时把这个容器滚回顶部。 */
export const ADMIN_SCROLL_SELECTOR = `[data-scroll-restoration-id="${ADMIN_SCROLL_ID}"]`
