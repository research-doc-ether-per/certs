// npm uninstall eslint-plugin-node
// npm install -D eslint@10 @eslint/js@10 prettier eslint-plugin-prettier@5 eslint-config-prettier@10 globals
// rm .eslintrc.json
// rm .eslintignore


// "@eslint/js": "^10.3.0",
// "eslint": "^10.3.0",
// "eslint-config-prettier": "^10.1.8",
// "eslint-plugin-prettier": "^5.5.5",
// "globals": "^16.0.0",
// "prettier": "^3.7.4"

// {
//   "editor.showUnused": true,
//   "eslint.validate": ["javascript", "javascriptreact"],
//   "eslint.workingDirectories": [
//     {
//       "mode": "auto"
//     }
//   ],
//   "editor.codeActionsOnSave": {
//     "source.fixAll.eslint": "explicit"
//   },
//   "editor.formatOnSave": false
// }


const js = require('@eslint/js')
const globals = require('globals')
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended')

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'logs/**',
      'dist/**',
      'build/**',
      'coverage/**',
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
        ...globals.node,
        ...globals.es2021,
      },
    },
    rules: {
      'no-console': 'warn',
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },

  eslintPluginPrettierRecommended,
]
