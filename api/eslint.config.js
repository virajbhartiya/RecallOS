// eslint.config.js
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';

export default [
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': typescriptEslint,
    },
    rules: {
      // TypeScript specific rules
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      // Require blank lines between functions and logical blocks
      'padding-line-between-statements': [
        'error',
        // Spacing before return statements
        { prev: '*', next: 'return', blankLine: 'always' },
        // Spacing before control flow statements
        { prev: '*', next: 'if', blankLine: 'always' },
        { prev: '*', next: 'for', blankLine: 'always' },
        { prev: '*', next: 'while', blankLine: 'always' },
        { prev: '*', next: 'switch', blankLine: 'always' },
        { prev: '*', next: 'try', blankLine: 'always' },
        // Spacing between function declarations
        { prev: 'function', next: 'function', blankLine: 'always' },
        { prev: 'function', next: '*', blankLine: 'always' },
        { prev: '*', next: 'function', blankLine: 'always' },
        // Spacing between class methods and static methods
        { prev: 'block-like', next: 'block-like', blankLine: 'always' },
        { prev: 'block-like', next: '*', blankLine: 'always' },
        { prev: '*', next: 'block-like', blankLine: 'always' },
        // Spacing between variable declarations and other statements
        { prev: 'const', next: 'const', blankLine: 'never' },
        { prev: 'let', next: 'let', blankLine: 'never' },
        { prev: 'var', next: 'var', blankLine: 'never' },
        { prev: ['const', 'let', 'var'], next: '*', blankLine: 'always' },
        { prev: '*', next: ['const', 'let', 'var'], blankLine: 'always' },
        // Spacing between import/export statements
        { prev: 'import', next: 'import', blankLine: 'never' },
        { prev: 'export', next: 'export', blankLine: 'never' },
        { prev: 'import', next: '*', blankLine: 'always' },
        { prev: '*', next: 'import', blankLine: 'always' },
        { prev: 'export', next: '*', blankLine: 'always' },
        { prev: '*', next: 'export', blankLine: 'always' },
      ],
    },
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      sourceType: 'module',
      ecmaVersion: 2022,
    },
  },
];
