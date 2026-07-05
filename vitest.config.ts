import { defineConfig, mergeConfig } from 'vitest/config'

import viteConfig from './vite.config'

// vite.config 现为函数形态(按 command 决定是否挂 Nitro:仅 build 挂)。测试要
// serve 形态(不挂 Nitro,否则 teardown 挂句柄),显式以 serve 求值后再 merge。
export default defineConfig(
  mergeConfig(viteConfig({ command: 'serve', mode: 'test' }), {
    test: {
      setupFiles: ['./src/testing/vitest-setup.ts'],
    },
  }),
)
