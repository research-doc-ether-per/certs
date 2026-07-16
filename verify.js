// npm install -D eslint-plugin-n
const js = require('@eslint/js')
const prettierPlugin = require('eslint-plugin-prettier')
const nPlugin = require('eslint-plugin-n')

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'logs/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '.prettierrc',
      'package-lock.json',
    ],
  },

  js.configs.recommended,

  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'commonjs',
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
      n: nPlugin,
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

      // Node.js で存在しない require / import を検出
      'n/no-missing-require': 'error',

      // package.json の dependencies に未定義のモジュール使用を検出
      'n/no-extraneous-require': 'warn',

      // Node.js 非対応構文チェック
      'n/no-unsupported-features/es-syntax': [
        'error',
        {
          version: '>=20.0.0',
          ignores: [],
        },
      ],
    },
  },
]
