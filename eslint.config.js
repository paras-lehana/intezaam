/**
 * Repo-wide ESLint flat config — the lint gate.
 *
 * Responsibility: one rule set for every workspace, the e2e suite and the config files, with
 * zero warnings allowed (`npm run lint` passes --max-warnings 0) and no inline suppressions.
 * Boundary: code rules only; layout belongs to Prettier, so eslint-config-prettier comes last
 * and switches the overlapping rules off.
 */
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      'playwright-report/**',
      'test-results/**',
      'docs/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    languageOptions: {
      globals: { ...globals.node },
    },
    linterOptions: {
      noInlineConfig: true,
      reportUnusedDisableDirectives: 'error',
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      // House rule: no type casts. `as const` is always allowed by this rule; every other
      // assertion (`as T`, `<T>x`) must become a schema parse, a type guard or a narrower type.
      '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-console': 'error',
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
      'no-var': 'error',
      curly: ['error', 'multi-line'],
      // House rules (CONTRIBUTING.md), enforced rather than only stated: files stay under 250
      // lines, blocks nest at most three deep and callbacks four, functions take at most five
      // parameters (more travel as one typed object) and stay under 20 branches.
      'max-lines': ['error', { max: 250 }],
      'max-depth': ['error', 3],
      'max-nested-callbacks': ['error', 4],
      'max-params': ['error', 5],
      // Branching stays readable: a function past 20 paths is split into named steps.
      complexity: ['error', 20],
    },
  },
  {
    // Components stay under 150 lines: one component per file, split before it grows.
    files: ['apps/web/src/**/*.tsx'],
    ignores: ['apps/web/src/__tests__/**'],
    rules: {
      'max-lines': ['error', { max: 150 }],
    },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser },
    },
    plugins: { 'react-hooks': reactHooks, 'jsx-a11y': jsxA11y },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.strict.rules,
      // WebKit drops list semantics from `list-style: none` lists, so explicit role="list" is required.
      'jsx-a11y/no-redundant-roles': ['error', { ul: ['list'], ol: ['list'] }],
    },
  },
  prettier,
);
