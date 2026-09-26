import { describe, expect, it } from 'vitest';

import {
  normalizeMediaUrl,
  normalizeMediaArray,
} from '@/lib/property-media';

describe('property media normalization', () => {
  it('accepts a public EYESITE media path', () => {
    expect(
      normalizeMediaUrl('submissions/request-1/assets/photo.jpg'),
    ).toBe(
      'https://xhvpvpvtkdgnnxdwdrkn.supabase.co/storage/v1/object/public/eyesite-media/submissions/request-1/assets/photo.jpg',
    );
  });

  it('rejects explicit staging/private paths', () => {
    expect(
      normalizeMediaUrl('eyesite-staging/user/imagenes/photo.jpg'),
    ).toBeNull();

    expect(
      normalizeMediaUrl('eyesite-private/user/document.pdf'),
    ).toBeNull();

    expect(
      normalizeMediaUrl(
        '/storage/v1/object/public/eyesite-staging/user/photo.jpg',
      ),
    ).toBeNull();
  });

  it('rejects legacy user UUID storage paths', () => {
    expect(
      normalizeMediaUrl(
        '02415ee6-25b5-46af-94ee-f530d03437ce/imagenes/photo.jpg',
      ),
    ).toBeNull();
  });

  it('filters unpromoted media out of arrays', () => {
    expect(
      normalizeMediaArray([
        '02415ee6-25b5-46af-94ee-f530d03437ce/imagenes/photo.jpg',
        'submissions/request-1/assets/photo.jpg',
      ]),
    ).toEqual([
      'https://xhvpvpvtkdgnnxdwdrkn.supabase.co/storage/v1/object/public/eyesite-media/submissions/request-1/assets/photo.jpg',
    ]);
  });
});
