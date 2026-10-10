module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'public'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  settings: { react: { version: '18.2' } },
  plugins: ['react-refresh', 'unused-imports'],
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      extends: ['plugin:@typescript-eslint/recommended'],
      rules: {
        '@typescript-eslint/no-unused-vars': 'off',
      },
    },
    {
      // shadcn primitives and Lexical nodes/plugins export helpers next to components by design.
      files: ['src/components/ui/**', 'src/components/elements/editor/**'],
      rules: { 'react-refresh/only-export-components': 'off' },
    },
    {
      files: ['**/*.test.{js,jsx,ts,tsx}', 'src/test/**'],
      env: { node: true },
      globals: { vi: 'readonly', describe: 'readonly', it: 'readonly', expect: 'readonly', beforeEach: 'readonly', afterEach: 'readonly' },
    },
  ],
  rules: {
    'no-unused-vars': 'off',
    'unused-imports/no-unused-imports': 'error',
    'unused-imports/no-unused-vars': ['error', { args: 'after-used', argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none', ignoreRestSiblings: true }],
    'react/no-unknown-property': ['error', { ignore: ['cmdk-input-wrapper'] }],
    'react/jsx-no-target-blank': 'off',
    'react/prop-types': 'off',
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true, allowExportNames: ['useTheme'] },
    ],
    "no-restricted-imports": [
      "error",
      {
        "paths": [{
          "name": "react-router-dom",
          "importNames": ["Link"],
          "message": "Link from react-router-dom is not recommended, use BetterRouter/Link from local instead"
        }]
      }
    ]
  },
}
