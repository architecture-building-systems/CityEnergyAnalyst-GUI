module.exports = {
  /* your base configuration of choice */
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:prettier/recommended',
  ],
  parser: '@babel/eslint-parser',
  parserOptions: {
    sourceType: 'module',
    requireConfigFile: false,
  },
  env: {
    browser: true,
    node: true,
  },
  globals: {
    MAIN_WINDOW_WEBPACK_ENTRY: true,
    MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: true,
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    // allow anonymous component functions
    'react/display-name': 0,
    // disallow console and debugger in production mode
    'no-console': process.env.NODE_ENV === 'production' ? 2 : 0,
    'no-debugger': process.env.NODE_ENV === 'production' ? 2 : 0,
    // allow spreading out properties from an object without warnings
    // 'no-unused-vars': [1, { ignoreRestSiblings: true }],
    'no-unused-vars': 'off',
    'react/prop-types': 'off',
  },
};
