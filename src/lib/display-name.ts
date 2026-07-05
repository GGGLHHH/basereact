// 展示名首字母兜底(头像 AvatarFallback 用):取前两个词的首字母,大写;
// 空/仅空白 → '?'。个人页与侧边栏 NavUser 共用,避免两处逻辑漂移。
export function nameInitials(name?: string | null): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean)
  const letters = words
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
  return (letters || '?').toUpperCase()
}
