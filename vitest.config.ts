import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/core/**'],
      // Só declarações de tipo: não há linha executável para cobrir.
      exclude: ['src/core/tipos.ts'],
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: 'reports/coverage',
      // INT-04: cobertura >= 70% no módulo src/core/. Abaixo disso o job ci falha.
      thresholds: { lines: 70, functions: 70, statements: 70, branches: 70 },
    },
  },
});
