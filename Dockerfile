# Frontend SSR server — TanStack Start + Nitro (node-server preset).
# `vite build` emits a self-contained .output/server/index.mjs that bundles server
# deps, serves .output/public static assets, and listens on $PORT. One `node` command.
#
# NOTE: /api is NOT handled here. The vite `/api → :8137` proxy is dev-only; in
# production route /api → the baserust backend with an external reverse proxy
# (nginx/traefik/ingress) in front of this container.

# --- builder: install deps + build (offline; codegen is dev-only) ---
FROM node:22-slim AS builder
WORKDIR /app
ENV CI=1
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

# Lockfile-first so the deps layer caches across source-only changes.
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
# openapi codegen only runs on `vite dev` (command === 'serve'); `vite build`
# compiles the committed src/generated/* — no backend needed at build time.
RUN pnpm run build

# --- runner: distroless (smallest + hardened) ---
# node runtime only — no shell, no package manager, runs as nonroot (uid 65532).
# Safe here: .output is pure JS with zero native .node addons (Nitro bundles deps
# into the server .mjs). ENTRYPOINT is already `node`, so CMD is just the script.
FROM gcr.io/distroless/nodejs22-debian12:nonroot AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# .output bundles the server, its node_modules, and the public/ static assets.
COPY --from=builder /app/.output ./.output

EXPOSE 3000
CMD [".output/server/index.mjs"]
