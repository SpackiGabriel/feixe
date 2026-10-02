import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/', 'prototypes/'] },
  js.configs.recommended,
  {
    files: ['src/**/*.js', 'gallery/**/*.js'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['gallery/shot.mjs'], // Node script that also runs code inside the page (window/document)
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    files: ['tests/**/*.js', 'eslint.config.js'],
    languageOptions: { globals: globals.node },
  },
];
