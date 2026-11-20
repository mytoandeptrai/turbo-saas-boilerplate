import { base, depend, node, unicorn } from '@infra-x/code-quality/lint'
import { defineConfig } from 'oxlint'

export default defineConfig({
  extends: [base(), unicorn(), depend(), node()],
  overrides: [
    {
      files: ['scripts/**/*.ts'],
      rules: {
        'typescript/no-explicit-any': 'off',
        // Scripts intentionally reach into src/ via relative paths.
        'import/no-relative-parent-imports': 'off',
      },
    },
  ],
})
