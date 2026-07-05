import { describe, expect, it } from 'vitest'

import { toDataPagination } from './pagination'

describe('toDataPagination', () => {
  it('maps offset PageInfo (size→limit, nullish total→0)', () => {
    expect(
      toDataPagination({ mode: 'offset', page: 2, size: 50, total: 137, total_pages: 3 }),
    ).toEqual({ limit: 50, page: 2, total: 137 })
    // total 省略/为 null → 兜 0。
    expect(toDataPagination({ mode: 'offset', page: 1, size: 20 })).toEqual({
      limit: 20,
      page: 1,
      total: 0,
    })
  })

  it('falls back to an empty first page when info is undefined (loading)', () => {
    expect(toDataPagination(undefined)).toEqual({ limit: 20, page: 1, total: 0 })
  })

  it('throws on cursor mode — a numbered pager cannot represent it', () => {
    expect(() =>
      toDataPagination({ mode: 'cursor', has_more: true, limit: 20, next_cursor: 'x' }),
    ).toThrow(/offset/)
  })
})
