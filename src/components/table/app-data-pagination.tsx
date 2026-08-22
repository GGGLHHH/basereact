import type { DataPaginationProps } from '@gedatou/cadenza-ui'
import { DataPagination } from '@gedatou/cadenza-ui'
import { useTranslation } from 'react-i18next'

interface AppDataPaginationProps
  extends Omit<DataPaginationProps, 'summary' | 'pageIndicator'
    | 'rowsPerPageLabel' | 'firstPageLabel' | 'previousPageLabel' | 'nextPageLabel' | 'lastPageLabel'> {
  /**
   * 当前页的行数,喂给摘要文案。
   *
   * 库版 `summary` 的入参只有 `{page, limit, total, totalPages}` —— 迁移前那个版本
   * 还给 `count`,而三处调用点的 `pagination.summary` 文案都要它。分页器本身不知道
   * 数据,所以由调用方从 `data.length` 传进来。
   */
  count: number
}

/**
 * cadenza `DataPagination` + 本仓库的 i18n 文案。
 *
 * 库本身零文案(导航键的可访问名称走英文兜底),六条中文文案要逐个从 props 注入。
 * 这一层存在的唯一理由就是别让那 11 个 prop 在每个表格页各抄一遍 —— 加一条语言键
 * 或改一处措辞时只改这里,不会漏掉某个页面的某个按钮。
 */
export function AppDataPagination({ count, ...props }: AppDataPaginationProps) {
  const { t } = useTranslation('common')

  return (
    <DataPagination
      {...props}
      rowsPerPageLabel={t('pagination.rowsPerPage')}
      firstPageLabel={t('pagination.firstPage')}
      previousPageLabel={t('pagination.previousPage')}
      nextPageLabel={t('pagination.nextPage')}
      lastPageLabel={t('pagination.lastPage')}
      pageIndicator={({ page, totalPages }) => t('pagination.pageOf', { page, totalPages })}
      summary={({ total }) => t('pagination.summary', { count, total })}
    />
  )
}
