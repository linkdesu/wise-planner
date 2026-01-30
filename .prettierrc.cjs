module.exports = {
  plugins: ['prettier-plugin-organize-imports'],
  singleQuote: true,
  semi: true,
  trailingComma: 'es5',
  tabWidth: 2,
  printWidth: 100,
  importOrder: [
    '^node:',
    '^react',
    '^[^./]',
    '^@trading-tool/',
    '^[./]',
  ],
};
