-- Remove a duplicate legacy public-read policy.
-- fotos-propiedades remains intentionally public until its remaining active
-- property reference is migrated; this migration does not change bucket access.
drop policy if exists "allow_public_read" on storage.objects;
