import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsparser from '@typescript-eslint/parser'

export default [
  { ignores: ['dist', 'node_modules', '*.config.js', '*.config.mjs'] },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.browser,
      parser: tsparser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // Base JS recommended
      ...js.configs.recommended.rules,
      // TS rules supersede the JS undef/unused-vars
      // (TS compiler handles undef; ts-eslint handles unused with underscore-ignore)
      'no-undef': 'off',
      'no-unused-vars': 'off',
      'no-redeclare': 'off',
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      // React hooks
      ...reactHooks.configs.recommended.rules,
      // Vite HMR contract — disabled because contexts and hooks are
      // co-located with their Provider components by design throughout
      // this codebase, and splitting every Provider into a second file
      // is a larger refactor than the lost fast-refresh optimization
      // is worth.
      'react-refresh/only-export-components': 'off',
    },
  },
  // Service worker source: runs in the ServiceWorkerGlobalScope, not a window.
  {
    files: ['src/pwa/**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.serviceworker },
    },
  },
  // Test files: vitest globals + lifecycle hooks
  {
    files: ['**/*.{test,spec}.{ts,tsx}', '**/test-setup.ts'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
]
