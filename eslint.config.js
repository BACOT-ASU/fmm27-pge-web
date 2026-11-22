import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

const BROWSER_ONLY = [
  'window', 'document', 'navigator', 'location', 'localStorage', 'sessionStorage',
  'indexedDB', 'IDBFactory', 'caches', 'fetch', 'XMLHttpRequest', 'Blob', 'File',
  'FileReader', 'URL', 'Worker', 'self', 'alert', 'confirm', 'prompt',
].map((name) => ({ name, message: 'src/core harus bebas API browser. Pakai antarmuka di src/platform/.' }));

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'legacy', 'scripts', 'data', 'research', 'dev-dist'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: { ...reactHooks.configs.recommended.rules },
  },
  {
    // Aturan wajib: core murni (lihat PROJECT_CONTEXT.md 4.6)
    files: ['src/core/**/*.ts'],
    languageOptions: { globals: {} },
    rules: {
      'no-restricted-globals': ['error', ...BROWSER_ONLY],
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['react', 'react-dom', 'react/*'], message: 'src/core tidak boleh bergantung pada UI.' },
          { group: ['**/platform/**', '**/ui/**', '**/workers/**'], message: 'src/core tidak boleh mengimpor platform/ui/workers.' },
        ],
      }],
    },
  },
);
