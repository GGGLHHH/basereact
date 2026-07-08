---
name: optimistic-cache-updates
description: Use when a TanStack Query (React Query v5) mutation must keep cached list and detail views in sync — after create/update/delete/set-roles, when a list or detail shows stale data after a successful mutation, or when a derived column (a name/avatar sourced from another entity) lags behind. Keywords React Query, useMutation, setQueryData, setQueriesData, invalidateQueries, refetchType.
---

# Optimistic Cache Updates (TanStack Query)

## Overview

When a mutation's `mutationFn` returns the updated entity, sync every affected cache from that response, then invalidate **quietly** so the fresh value is not immediately clobbered by a refetch.

**Core rule: patch the cache from the server response AND `invalidateQueries({ refetchType: 'none' })` — do both, never one alone.**

## The paradigm

On mutation success:

1. **Patch detail** — `setQueryData(detail(id), entity)`.
2. **Patch every cached list page** — `setQueriesData({ queryKey: [...,'list'] }, patchRows)`. The partial key matches every `{page,size}` page at once.
3. **Invalidate quietly** — `invalidateQueries({ queryKey: root, refetchType: 'none' })`.

```ts
onSuccess: (entity, { id }) => {
  // 2 — patch matching row across all cached list pages (partial key = all pages)
  queryClient.setQueriesData(
    { queryKey: ['users', 'list'] },
    (old) => (old ? { ...old, items: old.items.map((u) => (u.id === id ? entity : u)) } : old),
  )
  // 1 — detail
  queryClient.setQueryData(['users', 'detail', id], entity)
  // 3 — mark stale, DO NOT refetch now (the patch already holds server truth)
  queryClient.invalidateQueries({ queryKey: ['users'], refetchType: 'none' })
}
```

## Why `refetchType: 'none'` (the part everyone misses)

`invalidateQueries` defaults to `refetchType: 'active'` → it **immediately refetches every mounted query** under that key. On the edit page the detail query is mounted, so a plain invalidate fires a network refetch that **overwrites the patch you just wrote** — redundant (the patch already holds the server truth) and a visible flicker. `'none'` marks the queries stale **without** refetching; `refetchOnMount`/refocus reconciles on the next natural access.

Skip the invalidate entirely and the cache silently drifts: server-derived fields, row relocation, and concurrent edits by others never reconcile.

## Per-operation recipe

| Operation | Patch | Invalidate `{refetchType:'none'}` |
|---|---|---|
| update / set-roles (returns entity) | replace detail + list row | ✓ |
| delete | remove list row + `removeQueries(detail)` | ✓ |
| create | — (can't place it in the right sorted/paged slot) | ✓ (next-access refetch places it) |
| mutation on a **source** entity whose fields are denormalized into another list | patch the derived columns in that list + detail | ✓ on that list |

## Cover derived views

A field shown in a list/detail but **owned by another entity** (a profile's `display_name`/`avatar_url` denormalized into the user row) goes stale when you edit the source. The **source mutation** must patch **and** quietly-invalidate the dependent list/detail — not just its own cache. This is the most-missed case: the mutation looks unrelated to the list.

## When NOT to use this

- **True pre-response optimism** — UI must change *before* the server answers and you can guess the result: use `onMutate` snapshot + optimistic `setQueryData` + `onError` rollback + `onSettled` invalidate. This skill is the common case where the mutation **returns** the authoritative entity, so there is nothing to guess or roll back.
- **Row relocation** — an in-place patch can't move a row whose edit changes its sort/filter slot. The quiet invalidate fixes it on the next refetch; if it must be correct *instantly*, invalidate that one list with the default `refetchType` instead.

## Common mistakes

- Patch only, no invalidate → cache drifts (derived fields, relocation, concurrent edits).
- Invalidate only, no patch → correct but refetch flicker; not optimistic.
- Plain `invalidateQueries` (default refetchType) right after a `setQueryData` → the invalidate refetches the active query and clobbers the patch.
- Forgetting denormalized columns in **other** lists.
