// @ts-check
import antfu from '@antfu/eslint-config'
import betterTailwind from 'eslint-plugin-better-tailwindcss'

export default antfu(
  {
    // No `type: 'lib'` — this is an app, and 'app' is the default.
    // No `pnpm: true` either: pnpm-workspace.yaml here defines only
    // onlyBuiltDependencies and no catalogs, so eslint-plugin-pnpm would flag
    // every dependency for not using one.

    // @eslint-react + react-refresh. rules-of-hooks and exhaustive-deps are the
    // point; the react-x no-* rules also auto-migrate React 19 idioms
    // (forwardRef -> ref prop, Context.Provider -> Context).
    react: true,
    // Type-aware rules (projectService resolves each file's nearest tsconfig).
    // The point is ts/no-deprecated below: author-side @deprecated JSDoc
    // becomes visible at every call site.
    typescript: {
      tsconfigPath: 'tsconfig.json',
      overridesTypeAware: {
        // warn, not error: deprecation is a grace period by definition — the
        // symbol still works, the strikethrough + report is the migration nudge.
        'ts/no-deprecated': 'warn',
        // React 19's ReactNode includes Promise, so this rule's autofix turns
        // sync render callbacks into async ones — the callback then ALWAYS
        // returns a Promise and React suspends on every render. Too dangerous.
        'ts/promise-function-async': 'off',
      },
    },
    ignores: [
      // Carried over from .oxlintrc's ignorePatterns. dist, node_modules and
      // .claude are already in antfu's GLOB_EXCLUDE, so only these remain.

      // GitNexus's parse caches — hundreds of thousands of lint reports live in
      // there. It is listed in .git/info/exclude, which is local-only and which
      // antfu's `gitignore: true` never reads (it reads .gitignore alone), so
      // the ignore has to be stated here to hold for everyone.
      '.gitnexus',
      // Rewritten by `tsr generate` on every route change.
      'src/routeTree.gen.ts',
      // vite-plugin-openapi-codegen output.
      'src/generated',
      // Vendored shadcn source, sha256-pinned by src/components/ui-lock.test.ts
      // against its snapshot so `shadcn add` still diffs cleanly against
      // upstream. The class-order and stylistic fixers would rewrite these and
      // turn that test red.
      'src/components/ui',
      // Prose, not a lint surface — antfu lints fenced code blocks in markdown
      // by default, which would pull README.md and every .claude skill file in.
      '**/*.md',
    ],
  },
).append({
  name: 'basereact/tailwind',
  files: ['**/*.tsx'],
  plugins: { 'better-tailwindcss': betterTailwind },
  settings: {
    'better-tailwindcss': {
      entryPoint: 'src/styles.css',
      // Feeds tailwind's canonicalizeCandidates() as its `rem` option — without
      // it enforce-canonical-classes does no px-to-scale collapsing at all.
      // The comment in src/styles/tokens.css points at this value.
      rootFontSize: 16,
    },
  },
  rules: {
    // Auto-fixable.
    'better-tailwindcss/enforce-canonical-classes': 'error',
    'better-tailwindcss/enforce-consistent-class-order': 'error',
    'better-tailwindcss/enforce-consistent-important-position': 'error',
    'better-tailwindcss/enforce-consistent-variable-syntax': 'error',
    'better-tailwindcss/enforce-consistent-variant-order': 'error',
    'better-tailwindcss/enforce-shorthand-classes': 'error',
    'better-tailwindcss/no-duplicate-classes': 'error',
    'better-tailwindcss/no-unnecessary-whitespace': 'error',

    // No autofix, but these catch classes that silently produce no CSS.
    'better-tailwindcss/no-conflicting-classes': 'error',
    'better-tailwindcss/no-deprecated-classes': 'error',
    'better-tailwindcss/no-unknown-classes': ['error', {
      // ^i- are UnoCSS presetIcons classes (uno.config.ts) — nothing in the CSS
      // entry point defines them, so the rule cannot know them.
      // scroll-fade-inset used to be a local utility; it now comes from
      // @gedatou/cadenza-ui/styles.css as a real `@utility`, so the rule resolves
      // it on its own and the entry is gone. scrollbar-hidden went with it.
      ignore: ['^i-'],
    }],

    // House rule with no cadenza counterpart: colour comes from the token layer
    // in src/styles/tokens.css, never from a raw palette utility.
    'better-tailwindcss/no-restricted-classes': ['error', {
      restrict: [
        {
          pattern: '^(.*:)?(text|bg|border|ring|ring-offset|fill|stroke|from|to|via|divide|outline|decoration|shadow|accent|caret)-(zinc|gray|slate|neutral|stone|blue|green|red)-',
          message: 'Use a theme token (foreground/muted/info/success/destructive/border ...) instead of a raw Tailwind palette color.',
        },
        {
          pattern: '^(.*:)?(text|bg|border|ring|fill|stroke|from|to|via|divide|outline|decoration|shadow|accent|caret)-(black|white)\\b',
          message: 'Use a theme token (foreground/background ...) instead of raw black/white.',
        },
      ],
    }],

    // Deliberately NOT enabled, so the omission is a decision and not a gap:
    // enforce-consistent-line-wrapping (would re-wrap every long className at
    // printWidth 80), enforce-logical-properties (pl-* -> ps-*) and
    // no-concatenated-classes. cadenza runs all three.
  },
}).append({
  name: 'basereact/rule-overrides',
  rules: {
    // Carried over from .oxlintrc. Row keys in the table/list components are
    // index-based on purpose: the rows have no stable id before the server
    // assigns one.
    'react/no-array-index-key': 'off',

    // House preference, and the one deliberate departure from cadenza (which
    // takes antfu's default, `prefer-double`). The rule stays on at 'error' —
    // only the direction differs, so JSX attribute quotes are still enforced,
    // just single. This also restores what oxfmt's `jsxSingleQuote: true` gave
    // us before the move to eslint.
    'style/jsx-quotes': ['error', 'prefer-single'],
  },
})
