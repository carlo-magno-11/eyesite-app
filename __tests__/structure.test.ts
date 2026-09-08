import { describe, it, expect } from 'vitest';
import fs from 'fs';
describe('Estructura', () => {
  it('properties-data si existe tiene contenido', () => {
    if (!fs.existsSync('lib/properties-data.ts')) expect(true).toBe(true);
    else expect(fs.readFileSync('lib/properties-data.ts', 'utf8').length).toBeGreaterThan(10);
  });
  it('No hay console.log en hooks criticos', () => {
    const bad = ['useAuth', 'useAdminData'].filter((f) => {
      try {
        return (
          fs.readFileSync(`hooks/${f}.ts`, 'utf8').includes('console.log') ||
          fs.readFileSync(`hooks/${f}.tsx`, 'utf8').includes('console.log')
        );
      } catch {
        return false;
      }
    });
    expect(bad).toEqual([]);
  });
});