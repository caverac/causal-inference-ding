import eslint from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import prettier from 'eslint-config-prettier'
import { importX } from 'eslint-plugin-import-x'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig([
  globalIgnores([
    '**/node_modules/',
    '**/build/',
    '**/.docusaurus/',
    '.yarn/',
    'renv/',
    'packages/causalding/'
  ]),
  eslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,mts}'],
    extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      // Numbers read naturally in template literals, and D3 builds most of
      // its attribute strings that way; every other type stays disallowed.
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }]
    }
  },
  {
    files: ['**/*.{ts,tsx,mts,js,mjs,cjs}'],
    plugins: { 'import-x': importX },
    rules: {
      'import-x/no-duplicates': 'error',
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true }
        }
      ],
      'no-console': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^\\.{1,2}/',
              message: 'Import through the @site/ alias instead of a relative path.'
            }
          ]
        }
      ]
    }
  },
  {
    files: ['packages/docs/src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser }
  },
  {
    files: ['**/*.{js,mjs,cjs}', 'packages/docs/*.{ts,mts}', 'packages/docs/scripts/**/*.{ts,mts}'],
    languageOptions: { globals: globals.node }
  },
  prettier
])
