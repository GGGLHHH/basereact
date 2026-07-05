import type { PageInfo } from '#/generated/api-types'

export interface OffsetPage {
  limit: number
  page: number
  total: number
}

// ACL:后端 PageInfo(判别联合 offset|cursor)→ 数字分页器(DataPagination/DataTable)
// 要的扁平 {page, limit, total}。把「union 窄化 + 字段改名 size→limit + total 可空兜 0」
// 收敛到一处,免每个列表页手搓 `'total' in pageInfo` 那套。
//
// 数字分页器只服务 offset 列表;cursor(has_more/next_cursor,无页码/总数)表达不了
// → fail-loud,dev 期立刻抓误用。info 为 undefined(加载中/无数据)兜零集,让
// 分页器停在首页空态(DataPagination 视 total=0 为「未加载完」,不踩 page)。
export function toDataPagination(info: PageInfo | undefined): OffsetPage {
  if (!info) {
    return { limit: 20, page: 1, total: 0 }
  }
  if (info.mode !== 'offset') {
    throw new Error(`toDataPagination: 数字分页器只支持 offset 模式,收到 mode=${info.mode}`)
  }
  return { limit: info.size, page: info.page, total: info.total ?? 0 }
}
