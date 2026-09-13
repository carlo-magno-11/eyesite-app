import { describe, expect, test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');

describe('EYESITE 4 storage hardening', () => {

  test('mobile user uploads are namespaced by authenticated user id', () => {
    const src = fs.readFileSync(path.join(root, 'hooks/use-submit-property.ts'), 'utf8');
    expect(src).toContain("const path = `${user.id}/${folder}/");
  });

  test('admin documents use the private bucket', () => {
    const src = fs.readFileSync(path.join(root, 'public/admin.js'), 'utf8');
    expect(src).toContain("const BUCKET_FILES = 'eyesite-private';");
  });

  test('admin documents are not exposed with getPublicUrl', () => {
    const src = fs.readFileSync(path.join(root, 'public/admin.js'), 'utf8');
    expect(src).toContain("isPrivateBucket ? path :");
  });
});


test('user property submissions use private staging storage', () => {
  const source = fs.readFileSync(path.join(root, 'hooks/use-submit-property.ts'), 'utf8');
  expect(source).toContain("from('eyesite-staging')");
  expect(source).not.toContain("from('eyesite-media').getPublicUrl(path)");
});

test('public media uploads are restricted to admin in the mobile admin flow', () => {
  const source = fs.readFileSync(path.join(root, 'app/admin/solicitud/[id].tsx'), 'utf8');
  expect(source).toContain("from('eyesite-media').upload");
  expect(source).toContain('approvePropertyRequest');
});
