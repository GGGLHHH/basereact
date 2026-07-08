---
name: navigate-via-router
description: Use when writing any client-side navigation or redirect in this app — a Back button, a post-action redirect, an auth/401 bounce, or a route change from an HTTP interceptor, route guard, or other non-component module. Keywords navigate, redirect, history.back, window.location, window.history, globalRouter, TanStack Router, useNavigate, Link.
---

# Navigate via the Router (not `window.*`)

All navigation goes through TanStack Router. Never hand-roll `<a href>`, `window.location`, or `window.history` — they bypass the router (full reload, lost SPA state, no type-safe route checking).

## In a component — use hooks

- **Declarative link**: `<Link to="/admin/users" />` (or `<Button render={<Link to="/admin/users" />}>`).
- **Imperative**: `const navigate = useNavigate(); navigate({ to, params, search })`.
- **Back** (previous history entry): `const router = useRouter(); router.history.back()`.
  Not `window.history.back()` — the router's history keeps you inside the router's stack and works under memory history (tests).

## Outside a component — use the global router instance

Interceptors, route guards, plain utilities, event code — anything that can't call hooks — uses the registered singleton in `src/lib/global-router.ts`. There is **no** direct `import { router }`; the instance lives on `globalRouter.instance`, a **nullable** holder (set in `router.tsx` at startup, mockable in tests).

```ts
import { globalRouter } from '#/lib/global-router'

// nullable — guard it
globalRouter.instance?.navigate({ to: '/login' })
```

## The one allowed `window.location`

A deliberate full-page reload when the router is **not registered yet** (earliest boot, before `router.tsx` sets the instance) — the documented fallback in `api-client.ts`:

```ts
if (globalRouter.instance) {
  globalRouter.instance.navigate({ to: LOGIN_ROUTE })
} else if (!window.location.pathname.startsWith(LOGIN_ROUTE)) {
  window.location.assign(LOGIN_ROUTE) // router not up yet — hard fallback only
}
```

That boot fallback is the only place raw `window.location` navigation is correct.

## Quick reference

| Context | Use |
|---|---|
| component → route | `<Link>` / `useNavigate()` |
| component → back | `useRouter().history.back()` |
| non-component (interceptor / guard / util) | `globalRouter.instance?.navigate(...)` / `.history.back()` |
| router not yet registered (boot fallback only) | `window.location.assign(...)` |

## Common mistakes

- `window.history.back()` / `window.location.href = ...` in a component → use the router hook.
- `import { router } from './router'` in a non-component module → no such export; use `globalRouter.instance` (and guard the null).
- Forgetting the `?.` on `globalRouter.instance` → it is null until startup registers it.
