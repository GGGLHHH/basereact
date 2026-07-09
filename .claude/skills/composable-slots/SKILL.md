---
name: composable-slots
description: Use when a base/ui component needs customizable content regions — empty/loading/error state messages, a dropdown footer, a per-instance overridable action — and you're about to add xxxLabel / messages={{...}} props, a render-prop, or useTranslation inside the base. Keywords data-slot, slot, InfiniteSelect, InfiniteSelectEmpty, context, useTranslation i18n in base component, shadcn, composition over configuration, render prop, emptyLabel, messages object, retry button wiring.
---

# Composable Slots (not config props) for customizable component regions

## Overview

When a base component has regions callers must customize (state messages, footers, actions), expose them as **composable child components driven by context** — not `xxxLabel` string props, a `slots={{...}}` object, or render-props, and never with `useTranslation` inside the base.

**Core split:** the base owns *when / how / a11y / wiring* of a region; the caller owns *what text*, passed as `children`. i18n lives only in the business-layer wrapper.

This matches the repo's shadcn idiom (`data-slot` thin parts, `cn(base, className)`, `...props` passthrough) and the rule that `components/ui/*` and base components stay i18n-free.

## When to use

- A base/ui component hardcodes user-facing text (empty/loading/error, footer, placeholder) and callers need to customize or translate it.
- You're about to add `emptyLabel`/`loadingLabel`/`retryLabel` props, a `messages={{ empty, error }}` object, or `renderEmpty={() => …}`.
- A customizable region needs an internal action (retry, clear, close) hooked to the caller's button.

**Not for:** a region that is pure data (an item row → `getOption`/`renderItem`), or a one-off with a single caller.

## The pattern (5 parts)

1. **Base defines a state Context + hook — in the base file (the LOWEST layer).**
2. **Base exposes thin `data-slot` slot components** that read the context and self-render only in their state; text = their `children`.
3. **Base accepts the slots as `children`**, renders them under the provider, and renders **no text of its own**.
4. **Internal actions are injected via the context, not render-props** — the action slot grabs it from the hook; the caller passes only the label.
5. **The business wrapper composes i18n'd default slots** (`useTranslation` lives here) and exposes a `slots?` prop for per-instance override.

## Example (real: `src/components/select/infinite-select.tsx`)

```tsx
// BASE — zero text, zero i18n. Context + hook + slot parts live here (lowest layer).
interface InfiniteSelectState { isEmpty: boolean; isLoading: boolean; isError: boolean; onRetry?: () => void }
const StateCtx = createContext<InfiniteSelectState | null>(null)
function useState_() { const c = useContext(StateCtx); if (!c) throw new Error('slot outside InfiniteSelect'); return c }

export function InfiniteSelectEmpty({ className, ...p }: ComponentProps<'div'>) {
  return useState_().isEmpty ? <InfiniteSelectStatus className={className} {...p} /> : null
}
export function InfiniteSelectRetry({ className, onClick, ...p }: ComponentProps<typeof Button>) {
  const { onRetry } = useState_()                 // action injected via context, not a render-prop
  if (!onRetry) return null
  return <Button data-slot='infinite-select-retry' onClick={(e) => { onRetry(); onClick?.(e) }} {...p} />
}
// InfiniteSelect renders items + {children} under <StateCtx.Provider value={{ isEmpty, ... , onRetry }}>
```

```tsx
// BUSINESS WRAPPER — i18n lives ONLY here; composes defaults, allows override.
export function UserInfiniteSelect({ slots, ...props }: UserInfiniteSelectProps) {
  const { t } = useTranslation('common')
  const defaultSlots = (
    <>
      <InfiniteSelectEmpty>{t('loading.empty')}</InfiniteSelectEmpty>
      <InfiniteSelectLoading>{t('loading.loading')}</InfiniteSelectLoading>
      <InfiniteSelectError>
        {t('loading.failed')}
        <InfiniteSelectRetry>{t('action.retry')}</InfiniteSelectRetry>
      </InfiniteSelectError>
    </>
  )
  return <InfiniteCombobox slots={slots ?? defaultSlots} {...} />  // slots pass through as InfiniteSelect children
}
```

## Layering gotcha (circular imports)

Define the Context + hook in the **base** file, not a higher wrapper. Higher layers (the combobox, the business wrapper) already import the base; if the hook lived up there, the base importing it back is a **cycle**. Lowest layer *owns* the contract; upper layers only *fill* it (provider value) and *compose* it (slots).

Same rule for footer actions (clear/close): `InfiniteSelectActionsProvider` + `useInfiniteSelectActions` live in the base; the combobox fills the value.

## Common mistakes

| Instinct | Why avoid | Instead |
|---|---|---|
| `emptyLabel` / `errorLabel` string props | one prop per state; a state with a retry **button** isn't a string → degrades to a render-prop anyway | composable child components |
| `slots={{ empty, error }}` object prop | drops the `data-slot`/a11y centralization and the shadcn idiom; error still needs the action | `children` + `<XEmpty>` / `<XError>` parts |
| `error: (ctx) => …` render-prop to pass `retry` | caller re-threads the action every call; nests awkwardly | context hook: `<XRetry>` reads the action itself |
| English fallback text baked into the base | ships untranslated copy; leaks text into the ui layer | base renders nothing without a slot; defaults live in the wrapper |
| `useTranslation` inside the base/ui component | couples the base to locale | i18n only in the business wrapper |

## Quick reference

- **Base:** `createContext` + `useXState()` + `<XEmpty>/<XLoading>/<XError>/<XRetry>` (each `data-slot`; share one status container with `role='status'` for a11y) + render `{children}` under the provider.
- **Action slot:** `const { onRetry } = useXState(); if (!onRetry) return null` — wire it internally, label via `children`.
- **Business wrapper:** `const { t } = useTranslation()` → `const defaultSlots = <>…t()…</>` → `<Base slots={props.slots ?? defaultSlots}>`.
