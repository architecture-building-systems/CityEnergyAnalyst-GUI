const js = require('@eslint/js');
const globals = require('globals');
const react = require('eslint-plugin-react');
const reactHooks = require('eslint-plugin-react-hooks');
const reactCompiler = require('eslint-plugin-react-compiler');
const reactRefresh = require('eslint-plugin-react-refresh');
const importPlugin = require('eslint-plugin-import');
const jsxA11y = require('eslint-plugin-jsx-a11y');
const tanstackQuery = require('@tanstack/eslint-plugin-query');
const simpleImportSort = require('eslint-plugin-simple-import-sort');
const unusedImports = require('eslint-plugin-unused-imports');
const sonarjs = require('eslint-plugin-sonarjs');
const promise = require('eslint-plugin-promise');
const prettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = [
  {
    ignores: [
      'node_modules',
      'dist',
      'dist-ssr',
      'dist-electron',
      'out',
      'dependencies',
      '.yarn',
    ],
  },
  js.configs.recommended,
  react.configs.flat.recommended,
  reactHooks.configs.flat['recommended-latest'],
  importPlugin.flatConfigs.recommended,
  jsxA11y.flatConfigs.recommended,
  ...tanstackQuery.configs['flat/recommended'],
  sonarjs.configs.recommended,
  promise.configs['flat/recommended'],
  prettierRecommended,
  {
    settings: {
      react: {
        version: 'detect',
      },
      'import/resolver': {
        node: {
          paths: ['src'],
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
        },
      },
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
    },
    plugins: {
      'react-compiler': reactCompiler,
      'react-refresh': reactRefresh,
      'simple-import-sort': simpleImportSort,
      'unused-imports': unusedImports,
    },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'jsx-a11y/accessible-emoji': 'off',
      'react/prop-types': 'off',
      'react-compiler/react-compiler': 'error',
      // 'simple-import-sort/imports': 'error',
      // 'simple-import-sort/exports': 'error',
      'no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],
      'jsx-a11y/anchor-is-valid': [
        'error',
        {
          components: ['Link'],
          specialLink: ['hrefLeft', 'hrefRight'],
          aspects: ['invalidHref', 'preferButton'],
        },
      ],
      'react-refresh/only-export-components': 'warn',
      // Refactor-shaped sonarjs rules: real signal, but not worth
      // blocking lint:fix over pre-existing code. Bugs it can
      // actually prove (redundant-assignments, super-linear-regex)
      // stay at 'error'.
      'sonarjs/cognitive-complexity': 'warn',
      'sonarjs/no-nested-functions': 'warn',
      'sonarjs/no-nested-conditional': 'warn',
      'sonarjs/no-nested-template-literals': 'warn',
      'sonarjs/todo-tag': 'warn',
      'sonarjs/fixme-tag': 'warn',
      // Duplicates unused-imports/no-unused-vars above, but without
      // this codebase's `_prefix`-means-intentionally-unused
      // convention — would fight with it instead of complementing it.
      'sonarjs/no-unused-vars': 'off',
    },
  },
  {
    // Vitest's `globals: true` config injects describe/it/expect/vi/etc as
    // real globals at runtime - declare them here too so lint doesn't flag
    // every test file for using them.
    files: ['**/*.test.{js,jsx}', 'src/test/**/*.{js,jsx}'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        vi: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
  },
];
