import { describe, it, expect, vi } from 'vitest';
vi.mock('@/lib/supabase', () => ({ supabase: { from: vi.fn(() => ({ select: vi.fn() })) } }));
import fs from 'fs';
describe('Hooks', () => {
  it('useAuth existe', () => {
    expect(fs.existsSync('hooks/useAuth.tsx') || fs.existsSync('hooks/useAuth.ts')).toBe(true);
  });
  it('useAdminData existe', () => {
    expect(fs.existsSync('hooks/useAdminData.ts')).toBe(true);
  });
  it('use-properties existe', () => {
    expect(fs.existsSync('hooks/use-properties.ts')).toBe(true);
  });
  it('useRealtimeTable existe', () => {
    expect(fs.existsSync('hooks/useRealtimeTable.ts')).toBe(true);
  });
});