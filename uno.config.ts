import { defineConfig, presetIcons } from 'unocss'

export default defineConfig({
  presets: [
    presetIcons({
      scale: 1.2,
      warn: true,
      extraProperties: {
        display: 'inline-block',
        'vertical-align': 'middle',
        cursor: 'pointer',
      },
    }),
  ],
  // Tailwind owns `hidden`; keep UnoCSS from emitting a competing rule.
  blocklist: ['hidden'],
  content: {
    pipeline: {
      exclude: ['node_modules/**', 'dist/**'],
    },
  },
})
