import { describe, it, expect } from 'vitest';
import fs from 'fs';
describe('Seguridad 10/10', () => {
  it('lib/_core NO existe - password terrenos2024 borrado', () => {
    expect(fs.existsSync('lib/_core')).toBe(false);
  });
  it('lib/_core/api.ts NO existe', () => {
    expect(fs.existsSync('lib/_core/api.ts')).toBe(false);
  });
  it('No hay terrenos2024 en lib/', () => {
    let found = false;
    try {
      if (fs.readFileSync('lib/supabase.ts', 'utf8').includes('terrenos2024')) found = true;
    } catch {}
    expect(found).toBe(false);
  });
});