// eslint-disable-next-line no-undef
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'airbnb-base',
  ],
  env: {
    browser: false,
    es2021: true,
  },
  rules: {
    quotes: ['error', 'single'],
    'no-undef': ['off'],
    'max-len': ['off'],
    'import/no-extraneous-dependencies': ['off'],
    'no-console': ['off'],
    semi: ['error', 'never'],
  },
}
