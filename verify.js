// eslint.config.cjs
// npm install -D @eslint/js
const js = require('@eslint/js')
const prettierPlugin = require('eslint-plugin-prettier')
const nodePlugin = require('eslint-plugin-node')

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'logs/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '*.config.js',
      '*.config.cjs',
    ],
  },

  js.configs.recommended,

  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
      },
    },
    plugins: {
      prettier: prettierPlugin,
      node: nodePlugin,
    },
    rules: {
      'prettier/prettier': 'error',

      'no-console': 'warn',

      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],

      'node/no-unsupported-features/es-syntax': [
        'error',
        {
          version: '>=12.0.0',
          ignores: [],
        },
      ],
    },
  },
]
