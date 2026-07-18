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
    },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'jsx-a11y/accessible-emoji': 'off',
      'react/prop-types': 'off',
      'react-compiler/react-compiler': 'error',
      // 'simple-import-sort/imports': 'error',
      // 'simple-import-sort/exports': 'error',
      'jsx-a11y/anchor-is-valid': [
        'error',
        {
          components: ['Link'],
          specialLink: ['hrefLeft', 'hrefRight'],
          aspects: ['invalidHref', 'preferButton'],
        },
      ],
      'react-refresh/only-export-components': 'warn',
    },
  },
];
