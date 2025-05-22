module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  env: {
    node: true, // Assuming a Node.js environment
    es2021: true,
  },
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
    project: './tsconfig.eslint.json',
  },
  rules: {
    // Add any project-specific rules here
    // Example: 'no-console': 'warn',
  },
};
