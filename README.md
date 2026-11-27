# basereact

baserust 全家桶的前端:TanStack Start(React 19 + TanStack Router / Query,SSR 走 Nitro)+ Tailwind v4,
组件库用 [`@gedatou/cadenza-ui`](https://github.com/GGGLHHH/cadenza)(表单 `@gedatou/cadenza-form`、动画图标
`@gedatou/cadenza-icons`)。后端是同仓库组里的 baserust,接口类型从它的 OpenAPI 生成。

## 本地开发

```bash
pnpm install
cp .env.example .env   # 可选:不建 .env 时用 vite.config.ts 里的默认值
pnpm dev               # http://localhost:7621,/api 代理到 BACKEND_ORIGIN(默认 http://localhost:8137)
```

后端怎么起、整栈怎么用 Docker 起,见上一级 baserust-stack 的 README。

## 常用命令

| 命令 | 作用 |
|---|---|
| `pnpm dev` | 开发服务器(端口 `FRONTEND_DEV_PORT`) |
| `pnpm build` / `pnpm start` | 生产构建(产物 `.output/`)/ 本地跑构建产物 |
| `pnpm lint` / `pnpm fix` | ESLint 检查 / 自动修复 |
| `pnpm tsc` | 类型检查 |
| `pnpm test` | Vitest 单元 / 组件测试(happy-dom) |
| `pnpm check` | `fix` + `tsc` + `test` |
| `pnpm generate` | 从运行中的后端(`${BACKEND_ORIGIN}/api-docs/openapi.json`)重新生成 `src/generated/*` |
| `pnpm generate-routes` | 重新生成 `src/routeTree.gen.ts`(`pnpm dev` / `pnpm build` 也会自动重生成) |

CI(`.github/workflows/ci.yml`)依次跑 lint、tsc、test、build。

## 目录

| 路径 | 内容 |
|---|---|
| `src/routes/` | 文件路由。`admin/` 后台(纯客户端渲染,`_shell` 带侧栏和准入守卫),`frontend/` 公开站(SSR)。`-` 前缀的文件不进路由生成,放页面组件和测试 |
| `src/api/` | 按资源分的 TanStack Query hooks,调 `src/generated/client.ts` |
| `src/business/` | 业务组件(表格、弹窗、表单分区) |
| `src/components/` | 通用组件;`ui/` 是 shadcn 生成、被 `ui-lock.test.ts` 钉住哈希的少数几个,新组件用 cadenza-ui |
| `src/lib/` | api-client(ky + 401 刷新梯)、路由守卫、菜单、会话同步、错误上报等 |
| `src/i18n/` | i18next,`en-US` 是基准语言(key 类型从它推导),另有 `zh-CN` |
| `src/generated/`、`src/routeTree.gen.ts` | 生成文件,不手改 |
| `.claude/skills/` | 本仓库的写法约定(路由拆分、缓存同步、组件插槽、导航) |

## 部署

`Dockerfile` 构建 Nitro 自包含 server(`.output/server/index.mjs`,监听 `$PORT`,默认 3000)。容器本身不处理 `/api`:
生产由前面的 nginx 把 `/api` 转给后端、其余转给本容器(见 baserust-stack 的 `compose.yaml` 和 `deploy/`)。
构建时传 `APP_RELEASE` 会作为前端版本号随错误上报带给后端。
