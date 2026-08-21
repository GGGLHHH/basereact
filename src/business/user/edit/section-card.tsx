import type { ReactNode } from 'react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// 编辑页各分区统一外观:一个分区 = 一个 Card = 一个后端端点(独立保存)。
export function EditSectionCard({
  title,
  description,
  children,
}: {
  title: ReactNode
  description?: ReactNode
  children: ReactNode
}) {
  // description 是 ReactNode:空串/undefined 都算"没给",此时不占 CardHeader 的行距。
  const hasDescription = Boolean(description)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {hasDescription ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
