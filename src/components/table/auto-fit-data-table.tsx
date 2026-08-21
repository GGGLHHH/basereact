import type { DataTableProps } from '@gedatou/cadenza-ui'
import { DataTable } from '@gedatou/cadenza-ui'
import { useRef } from 'react'

import { TABLE_HEADER_HEIGHT, TABLE_ROW_HEIGHT, useAutoFitHeight } from './use-auto-fit-height'

// 首帧尚未量出高度时的兜底,与迁移前 data-table.tsx 的兜底同值。
const FALLBACK_MAX_HEIGHT = TABLE_HEADER_HEIGHT + TABLE_ROW_HEIGHT * 10

/**
 * cadenza `DataTable` + 本仓库的自适应高度。
 *
 * 库版只接受固定 `maxHeight`(默认 480),而本仓库的表格要撑满祖先的剩余空间 ——
 * 这是迁移里唯一需要自己补的能力。显式传了 `maxHeight` 就完全不测量(观察器都不挂),
 * 行为与直接用库版一致。
 */
export function AutoFitDataTable<T>({ maxHeight, ...props }: DataTableProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const autoFitHeight = useAutoFitHeight(containerRef, maxHeight === undefined)

  return (
    // min-h-0:祖先常是 flex 容器,不给这条最小高度会被内容撑开,量出来的剩余空间恒为负。
    <div
      ref={containerRef}
      className='min-h-0'
    >
      <DataTable
        {...props}
        maxHeight={maxHeight ?? autoFitHeight ?? FALLBACK_MAX_HEIGHT}
      />
    </div>
  )
}
