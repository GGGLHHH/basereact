import { defineConfig } from 'vite'
import { codeInspectorPlugin } from 'code-inspector-plugin'
import { openapiCodegen } from 'vite-plugin-openapi-codegen'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

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
    tanstackStart(),
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
