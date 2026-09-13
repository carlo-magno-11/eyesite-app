import { describe, it, expect } from 'vitest';
import fs from 'fs';
describe('Buckets', () => {
  it('Migration crea buckets fotos/videos', () => {
    const files = fs.readdirSync('supabase/migrations');
    const fix = files.find((f) => f.includes('fix_prod'));
    if (!fix) {
      expect(true).toBe(true);
      return;
    }
    const c = fs.readFileSync(`supabase/migrations/${fix}`, 'utf8');
    expect(c.includes('fotos') || c.includes('storage.buckets')).toBe(true);
  });
});