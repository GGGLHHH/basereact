---
name: structuring-route-sections
description: Use when adding, moving, or restructuring a file-based route inside an admin section (e.g. /admin/users) — a list, detail, create, edit, or nested sub-page — and deciding whether it nests, whether it replaces the screen full-width, and where route metadata (menu title, breadcrumb title, access policy, search validation) belongs. Keywords createFileRoute, TanStack file routes, layout route, index route, trailing underscore un-nest, staticData, accessPolicyKeys, menuTitleKey, breadcrumb, Outlet, nested routes.
---

# Structuring Route Sections

A multi-page admin area (list + create + detail + edit + sub-pages) is one **section**: a directory whose `route.tsx` is the layout parent, with the pages as children. This mirrors the URL hierarchy in the route *tree*, so the breadcrumb, menu, and access chain fall out for free. Copy an existing section rather than reinventing.

**Canonical examples in this repo — read one before writing:**
- `src/routes/admin/_shell/users/` — bare pass-through layout (no chrome), list/create/detail/edit.
- `src/routes/admin/_shell/nested/` — layout *with* shared Card chrome + deeper sub-sections.

## The shape

```
users/
  route.tsx          → createFileRoute('/admin/_shell/users')        layout parent
  index.tsx          → createFileRoute('/admin/_shell/users/')       landing / list
  new.tsx            → createFileRoute('/admin/_shell/users/new')    child leaf
  $userId.tsx        → createFileRoute('/admin/_shell/users/$userId')
  $userId_.edit.tsx  → createFileRoute('/admin/_shell/users/$userId_/edit')
```

## Four decisions

1. **Layout parent (`route.tsx`).** Omit `component` → TanStack renders a bare `<Outlet/>`, so children fill the screen with zero visual wrapper (what you usually want). Add a `component` returning shared chrome + `<Outlet/>` *only* if every page in the section should sit inside it (see `nested/`).

2. **Nest or un-nest a child.** A normal segment (`$userId`) nests — renders inside its parent's `<Outlet/>`. A **trailing-underscore** segment (`$userId_/edit`) un-nests from that sibling: edit replaces the detail screen instead of rendering inside it. Use `_` whenever a child would otherwise wrap in a sibling that has no `<Outlet/>`. The `_` is stripped from the URL — `/admin/users/$userId/edit` either way. Nesting choices change the *tree*, breadcrumb, and access chain, **never the URL**.

3. **Where metadata goes.**

   | Metadata | Put on | Why |
   |---|---|---|
   | `menuTitleKey`, `icon`, `groupKey` | layout `route.tsx` | the menu node is the route carrying `menuTitleKey`; children with only `titleKey` stay out of the menu |
   | section `accessPolicyKeys` | layout `route.tsx` | the menu node is pruned by *its own* policy, so section access must live where the menu title lives — and it then ANDs onto every child (fine when the whole section shares one permission set) |
   | `titleKey` | each child leaf | breadcrumb is the chain of `titleKey`s (`_shell.tsx`); the layout's `titleKey` becomes the clickable parent crumb |
   | per-page `accessPolicyKeys` | each child leaf | gate on the write op the page performs (`createUser`/`updateUser`) — ANDed with the section policy |
   | `validateSearch` | the one route that reads it (`index.tsx`) | putting it on the layout leaks the params onto every child |

4. **`index.tsx` carries no `titleKey`.** The layout already labels `/admin/users`; a second `titleKey` at the same path doubles the breadcrumb crumb.

## Before committing

- `npx tsr generate` — route tree is manual here (`generateOnDev/Hmr: false`). Then `npx tsc --noEmit`.
- Confirm the `to` union still lists the same URLs (`grep "'/admin/…" src/routeTree.gen.ts`) — existing `navigate({ to })` call sites should need no change.

## Common mistakes

- Child wraps blank because it nested into a sibling leaf with no `<Outlet/>` → add the trailing `_`.
- Menu entry won't hide for the unprivileged → the section `accessPolicyKeys` is on `index.tsx`, not on the layout that owns `menuTitleKey`.
- Detail/edit breadcrumb loses its parent → the pages are flat siblings (`users_.*`) instead of nested under the section directory.
- Section policy AND breaks a page → the section and that page require *different* permission sets; don't hoist the policy to the layout, keep it per-leaf.
