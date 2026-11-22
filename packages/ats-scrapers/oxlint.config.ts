import { base, depend, node, promise, unicorn, vitest } from '@infra-x/code-quality/lint'
import { defineConfig } from 'oxlint'

export default defineConfig({
  extends: [
    base(),
    unicorn(),
    depend(),
    node(),
    promise(),
    vitest({ files: ['**/*.{test,spec}.ts'] }),
  ],
  overrides: [
    {
      // Scripts intentionally reach into src/ via relative paths.
      files: ['scripts/**/*.ts'],
      rules: { 'import/no-relative-parent-imports': 'off' },
    },
  ],
})
