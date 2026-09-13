import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      // Mismo alias que tsconfig.json ("@/*": ["./*"]) para que los tests
      // puedan importar módulos de la app (ej. @/lib/supabase).
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: { environment: 'jsdom', globals: true, include: ['__tests__/**/*.test.ts'] },
});