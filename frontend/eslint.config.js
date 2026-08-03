'use strict';
const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  js.configs.recommended,
  {
    files: ['client/**/*.js'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.jasmine,
        ...globals.node,
        angular: 'readonly', _: 'readonly', $: 'readonly', jQuery: 'readonly',
        jsPlumb: 'readonly', moment: 'readonly', d3: 'readonly', nv: 'readonly',
        NODE_ENV: 'readonly', inject: 'readonly'
      }
    },
    rules: {
      // Legacy AngularJS 1.x codebase — keep lint runnable (not a gate); surface real issues
      // as warnings rather than failing on long-standing style.
      'no-unused-vars': 'warn',
      'no-undef': 'warn',
      'no-redeclare': 'warn',
      'no-empty': 'warn',
      'no-prototype-builtins': 'off',
      'no-cond-assign': 'warn',
      'no-fallthrough': 'warn',
      'no-useless-escape': 'off'
    }
  },
  { ignores: ['dist/**', 'node_modules/**', 'vendor/**', 'config/**'] }
];
