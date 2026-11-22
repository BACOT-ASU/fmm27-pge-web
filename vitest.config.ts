import { defineConfig } from 'vitest/config';

// Tes core dijalankan di lingkungan Node (bukan jsdom): kalau lulus di sini,
// src/core benar-benar bebas API browser.
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'core',
          environment: 'node',
          include: ['src/core/**/*.test.ts', 'tests/**/*.test.ts'],
        },
      },
    ],
  },
});
