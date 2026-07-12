import { defineConfig } from 'vite'
import UnoCSS from 'unocss/vite'
import { codeInspectorPlugin } from 'code-inspector-plugin'
import { openapiCodegen } from 'vite-plugin-openapi-codegen'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig(({ command }) => ({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    openapiCodegen({
      input: 'http://localhost:8137/api-docs/openapi.json',
      output: 'src/generated',
      pathPrefix: '/api/v1/',
      typeAliases: true,
      httpClient: {
        module: '#/lib/api-client',
      },
      generateOnDev: false,
      generateOnHmr: false,
    }),
    tailwindcss(),
    UnoCSS(),
    tanstackStart(),
    // Node/Docker 部署:官方要求经 Nitro 出自包含 server(.output/server/index.mjs,
    // 自带静态资产 + SSR + 监听 PORT)。见 docs/framework/react/guide/hosting。
    // 仅 build 期挂 Nitro:dev 用 TanStack Start(Vite)自带 dev server,才认下面
    // server.proxy 的 /api 转发到后端;Nitro dev server 不认 Vite proxy,挂了 /api
    // 就落到 SSR handler 返回 HTML(500 Only HTML requests are supported here)。
    // 测试环境也排除:nitro 会在 vitest teardown 时挂住句柄(close timed out)。
    ...(command === 'build' && process.env.VITEST !== 'true' ? [nitro()] : []),
    codeInspectorPlugin({
      bundler: 'vite',
      dev: () => process.env.NODE_ENV === 'development' && process.env.VITEST !== 'true',
    }),
    viteReact(),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8137',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  test: {
    // Node 24+ 遮蔽 jsdom/happy-dom 的 Web Storage → 补内存版兜底(见 src/test-setup.ts)。
    setupFiles: ['./src/test-setup.ts'],
  },
}))

export default config
