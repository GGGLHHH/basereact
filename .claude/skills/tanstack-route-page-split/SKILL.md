---
name: tanstack-route-page-split
description: "Use when a TanStack Router file-based route's page component (or any non-Route value) must be imported elsewhere — to unit-test or reuse it — and you're about to add `export` to it in the route file. Covers the router code-splitting warning (\"will not be code-split\" / \"increase your bundle size\") and the `-` dash-prefix convention for colocated non-route and test files."
---

# TanStack Route Page Split

## Overview

A TanStack Router file-based route file (`src/routes/**/foo.tsx`) should export **only** `Route`; the page component stays inline. The moment that component must be imported elsewhere (a unit test, reuse), do **not** add `export` to it in the route file — move it to a sibling file prefixed with `-`, which the route generator ignores.

**Core principle:** route files export `Route` and nothing else. Anything importable lives in a `-`-prefixed colocated file.

## When to Use

- Unit-testing a route's page component in isolation.
- Another module needs a component/helper currently defined inside a route file.
- You see: `[tanstack-router] These exports ... will not be code-split and will increase your bundle size`.

**When NOT to use:** the component is only ever the route's `component` and nothing imports it — leave it inline. Don't split preemptively.

## The Pattern

❌ **Wrong** — export the component from the route file (breaks code-splitting, triggers the warning):

```tsx
// src/routes/admin/_shell/home.tsx
export const Route = createFileRoute('/admin/_shell/home')({ component: AdminHomePage, ... })
export function AdminHomePage() { ... }   // ← non-Route export = warning + un-split chunk
```

✅ **Right** — component in a `-`-prefixed sibling; route file stays thin:

```tsx
// src/routes/admin/_shell/-home-page.tsx   (dash prefix → ignored by route generator)
export function AdminHomePage() { ... }
```
```tsx
// src/routes/admin/_shell/home.tsx
import { createFileRoute } from '@tanstack/react-router'
import { AdminHomePage } from './-home-page'
export const Route = createFileRoute('/admin/_shell/home')({ component: AdminHomePage, ... })
```
```tsx
// src/routes/admin/_shell/-home.test.tsx   (dash prefix → not a phantom route)
import { AdminHomePage } from './-home-page'
```

## Quick Reference

| File | Role | Exports |
|------|------|---------|
| `foo.tsx` | route (generator-scanned) | `Route` only |
| `-foo-page.tsx` | page component (ignored) | the component / helpers |
| `-foo.test.tsx` | colocated test (ignored) | — |

Loaders, `staticData`, `beforeLoad`, and the `createFileRoute` call itself stay in the route file. The ignore prefix is TanStack Router's `routeFileIgnorePrefix` (default `-`).

## Common Mistakes

- **Adding `export` to the inline component** to make it importable → the warning + a chunk that no longer code-splits. Split to a `-`-file instead.
- **A test file `foo.test.tsx` under `routes/` without the `-`** → the generator turns it into a phantom route. Name it `-foo.test.tsx` (or place it outside `routes/`).
- **Splitting every route preemptively** → churn for components nothing imports. Split only when something actually imports it.

## Real example

`src/routes/admin/_shell/profile.tsx` (thin route) + `-profile-page.tsx` (component) + `-profile.test.tsx` (test).
