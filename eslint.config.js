import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'build/**',
      'scripts/**',
      'test/**/*.js',
      'test/**/*.mjs',
      'test/**/*.cjs',
      'test-dist/**',  // Ignore compiled test files
      '*.js',
      '*.mjs', 
      '*.cjs',
      '**/*.d.ts'  // Ignore TypeScript declaration files
    ]
  },
  {
    // Convert base JS recommended rules to warnings for migration phase
    rules: Object.fromEntries(
      Object.entries(js.configs.recommended.rules || {}).map(([key, value]) => [
        key, 
        value === 'error' ? 'warn' : value
      ])
    )
  },
  {
    files: ['src/**/*.ts', 'test/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
        project: './tsconfig.eslint.json'
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
        exports: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': tsPlugin
    },
    rules: {
      // Import recommended rules but convert errors to warnings for migration phase
      ...Object.fromEntries(
        Object.entries(tsPlugin.configs.recommended.rules).map(([key, value]) => [
          key, 
          value === 'error' ? 'warn' : value
        ])
      ),
      // Temporarily relaxed rules to get CI working - matching legacy config
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn', 
      '@typescript-eslint/no-var-requires': 'off',
      'no-useless-catch': 'warn',
      'no-case-declarations': 'warn',
      'prefer-const': 'warn',
      'no-useless-escape': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
      'no-undef': 'off', // Disabled for test files that use vitest globals
      'no-prototype-builtins': 'warn'
    }
  }
];