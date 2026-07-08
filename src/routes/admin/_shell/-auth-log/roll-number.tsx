import Counter from '@/components/Counter'

// 滚动数字(react-bits Counter)统一封装。value 变化即 odometer 滚动;live 数据驱动全板数字联动。
// gradientFrom 用 card 底色,上下渐隐融进卡片不露黑边;渐隐高度随字号缩放,小字号才不被吃掉。
export function RollNumber({
  value,
  fontSize = 30,
  color,
  weight = 600,
}: {
  value: number
  fontSize?: number
  color?: string
  weight?: React.CSSProperties['fontWeight']
}) {
  return (
    <span
      className='inline-flex font-mono leading-none'
      style={{ fontWeight: weight }}
    >
      <Counter
        value={value}
        fontSize={fontSize}
        fontWeight={weight}
        gap={1}
        horizontalPadding={0}
        borderRadius={0}
        gradientHeight={Math.max(2, Math.round(fontSize * 0.16))}
        gradientFrom='var(--card)'
        gradientTo='transparent'
        textColor={color ?? 'inherit'}
      />
    </span>
  )
}
