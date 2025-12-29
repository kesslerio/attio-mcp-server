import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import importPlugin from 'eslint-plugin-import';

export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'coverage-e2e/**',
      'build/**',
      'scripts/**',
      'scripts/fix/**',
      'test/**/*.js',
      'test/**/*.mjs',
      'test/**/*.cjs',
      'test-dist/**', // Ignore compiled test files
      '.smithery/**',
      'test-results/**',
      'test/e2e/outputs/**',
      '*.js',
      '*.mjs',
      '*.cjs',
      '**/*.d.ts', // Ignore TypeScript declaration files
      'logs/**',
      'logs.backup/**',
      'temp/**',
      'tmp/**',
      '.wireit/**',
      'tsconfig.tsbuildinfo',
    ],
  },
  {
    // Convert base JS recommended rules to warnings for migration phase
    rules: Object.fromEntries(
      Object.entries(js.configs.recommended.rules || {}).map(([key, value]) => [
        key,
        value === 'error' ? 'warn' : value,
      ])
    ),
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
        project: './configs/tsconfig/tsconfig.eslint.json',
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      import: importPlugin,
    },
    settings: {
      'import/resolver': {
        typescript: {
          project: [
            './tsconfig.json',
            './test/tsconfig.json',
            './configs/tsconfig/tsconfig.eslint.json',
            './configs/tsconfig/tsconfig.tests.json',
          ],
          alwaysTryTypes: true,
        },
      },
    },
    rules: {
      // Import recommended rules but convert errors to warnings for migration phase
      ...Object.fromEntries(
        Object.entries(tsPlugin.configs.recommended.rules).map(
          ([key, value]) => [key, value === 'error' ? 'warn' : value]
        )
      ),
      // Temporarily relaxed rules to get CI working - matching legacy config
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-var-requires': 'off',
      'no-useless-catch': 'warn',
      'no-case-declarations': 'warn',
      'prefer-const': 'warn',
      'no-useless-escape': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
      'no-undef': 'off',
      'no-prototype-builtins': 'warn',
      // Guardrail: disallow console.* in src/ except allowlisted files
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  {
    // Allow console in CLI and legacy or explicitly allowlisted files
    files: ['src/cli.ts', 'src/handlers/tools.ts.old'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    // Test-specific overrides to keep lint warnings under control in CI/pre-commit
    files: ['test/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
        project: './configs/tsconfig/tsconfig.eslint.json',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      import: importPlugin,
    },
    settings: {
      'import/resolver': {
        typescript: {
          project: [
            './tsconfig.json',
            './test/tsconfig.json',
            './configs/tsconfig/tsconfig.eslint.json',
            './configs/tsconfig/tsconfig.tests.json',
          ],
          alwaysTryTypes: true,
        },
      },
    },
    rules: {
      'no-console': 'off',
      'no-undef': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
];
