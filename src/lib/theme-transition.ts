// 主题切换的圆形揭示动画:以最后光标位置为圆心,用 View Transition API 把新主题
// 的根快照(::view-transition-new(root))clip 成一个逐渐扩大的圆。不支持时直接切。
// 配套 CSS 在 styles.css(.theme-transitioning 作用域禁默认交叉淡入 + 抬 z-index)。

let lastMouseX = typeof window !== 'undefined' ? window.innerWidth / 2 : 0
let lastMouseY = typeof window !== 'undefined' ? window.innerHeight / 2 : 0

if (typeof window !== 'undefined') {
  window.addEventListener(
    'mousemove',
    (event) => {
      lastMouseX = event.clientX
      lastMouseY = event.clientY
    },
    { passive: true },
  )
}

export function toggleThemeWithTransition(callback: () => void): void {
  if (typeof document === 'undefined' || !('startViewTransition' in document)) {
    callback()
    return
  }

  const x = lastMouseX
  const y = lastMouseY
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  )

  document.documentElement.classList.add('theme-transitioning')

  const transition = document.startViewTransition(async () => {
    callback()
    await new Promise((resolve) => setTimeout(resolve, 0))
  })

  transition.ready.then(() => {
    document.documentElement.animate(
      {
        clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`],
      },
      {
        duration: 400,
        easing: 'ease-in-out',
        pseudoElement: '::view-transition-new(root)',
      },
    )
  })

  transition.finished.finally(() => {
    document.documentElement.classList.remove('theme-transitioning')
  })
}
