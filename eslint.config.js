import js from '@eslint/js';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

export default [
  {
    ignores: ['dist/**', 'public/vendor/**', 'playwright-report/**', 'test-results/**'],
  },
  // First-party game source: browser runtime with melonJS v4 as a global.
  {
    files: ['js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        // melonJS v4 vendored global (loaded via <script> in index.html).
        me: 'readonly',
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      // The game assigns self-starting tweens to locals for readability; don't
      // fail the build on those. Real problems still surface as warnings.
      'no-unused-vars': 'warn',
    },
  },
  // Tooling / test config: Node ESM. Playwright specs also contain
  // page.evaluate callbacks that run in the browser, so allow browser globals.
  {
    files: ['*.config.js', 'eslint.config.js', 'tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
    },
  },
  prettier,
];
