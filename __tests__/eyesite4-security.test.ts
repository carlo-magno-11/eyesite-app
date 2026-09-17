import { describe, it, expect } from 'vitest';
import fs from 'fs';

describe('EYESITE 4 security boundary', () => {
  it('the public app reads the safe property projection', () => {
    const source = fs.readFileSync('hooks/use-properties.ts', 'utf8');

    expect(source).toContain('propiedades_publicas');
    expect(source).not.toContain(".from('propiedades')\n");
  });

  it('moderation is not performed with direct client writes', () => {
    const source = fs.readFileSync('hooks/useAdminData.ts', 'utf8');

    expect(source).not.toContain(".from('propiedades').insert");
    expect(source).not.toContain(".from('propiedades').update");
    expect(source).not.toContain(".from('propiedades').delete");
    expect(source).not.toContain('approvePropertyRequest');
    expect(source).not.toContain('rejectPropertyRequest');
  });

  it('admin panel uses server-side moderation RPCs', () => {
    const source = fs.readFileSync(
      'public/admin.js',
      'utf8'
    );

    expect(source).toContain('admin_approve_property_request');
    expect(source).toContain('admin_reject_property_request');
  });
});