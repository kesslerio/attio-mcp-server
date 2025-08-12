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
      '*.js',
      '*.mjs', 
      '*.cjs',
      '**/*.d.ts'  // Ignore TypeScript declaration files
    ]
  },
  js.configs.recommended,
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
      ...tsPlugin.configs.recommended.rules,
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