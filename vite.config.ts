import { defineConfig } from 'vite'
import UnoCSS from 'unocss/vite'
import { codeInspectorPlugin } from 'code-inspector-plugin'
import { openapiCodegen } from 'vite-plugin-openapi-codegen'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
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
    // 测试环境排除:nitro 会在 vitest teardown 时挂住句柄(close timed out)。
    ...(process.env.VITEST === 'true' ? [] : [nitro()]),
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
})

export default config
