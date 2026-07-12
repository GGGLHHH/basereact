// Vitest 全局 setup。
// Node 24+ 内置了实验性 Web Storage 全局(localStorage/sessionStorage);未提供
// `--localstorage-file` 时它处于禁用态,还会遮蔽 jsdom/happy-dom 各自的实现 ——
// 于是测试里 `window.localStorage` 变成 undefined(见 i18n locale 持久化测试)。
// 这里补一个内存版 Storage 兜底,让依赖 Web Storage 的测试可跑;不影响生产代码。

function memoryStorage(): Storage {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value))
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    },
    key: (index: number) => [...store.keys()][index] ?? null,
    get length() {
      return store.size
    },
  } as Storage
}

const target = globalThis as unknown as Record<string, Storage | undefined>
for (const name of ['localStorage', 'sessionStorage']) {
  if (target[name] == null) {
    target[name] = memoryStorage()
  }
}
