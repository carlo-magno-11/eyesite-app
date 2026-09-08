import { describe, it, expect } from 'vitest';
import fs from 'fs';
describe('RLS fix', () => {
  it('Existe migration fix_prod con is_admin()', () => {
    const files = fs.readdirSync('supabase/migrations');
    expect(files.some((f) => f.includes('fix_prod'))).toBe(true);
    const fix = files.find((f) => f.includes('fix_prod'))!;
    const content = fs.readFileSync(`supabase/migrations/${fix}`, 'utf8');
    expect(content.includes('is_admin')).toBe(true);
  });
});