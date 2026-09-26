# EYESITE — Server-side media mutation hardening (2026-09-26)

## Scope

Working branch: `fix/eyesite-platform-security-20260925`

This change hardens the privileged property mutation boundary without changing `main`, `release/eyesite-definitive`, or Supabase production.

## Changes

- Added `supabase/migrations/20260926190000_harden_admin_property_media.sql`.
- Added private helper `private.assert_public_property_media_payload(jsonb)`.
- `admin_create_property` now validates public media references before inserting a catalog property.
- `admin_update_property` validates media only when media fields are included in the edit payload.
- Accepted public media references must point to the EYESITE `eyesite-media` public bucket.
- Private documents such as `archivos`, `pdfs`, and `kmz_kml` are intentionally excluded from this public-media validator.
- Existing legacy rows are not rewritten automatically. An unrelated edit to a legacy row can proceed unless the edit attempts to replace its public media.
- No production migration was applied.

## Why

Client-side validation in `public/admin.js` improves UX but is not a security boundary. The privileged PostgreSQL RPCs must independently reject staging/private/legacy references before they can enter or overwrite the public catalog.

## Current known media repair

`Casa prueba 6` has a legacy/staging media reference. The correct repair remains controlled promotion/re-upload into `eyesite-media`; `lib/property-media.ts` must not be weakened to expose staging/private media.

## Verification state

- Previous commit `142cd925`: CI fully green (TypeScript, lint, tests, Web export, iOS native generation, Privacy Manifest).
- New commit: `e38e3aba0975bf445cbb5d3a36923564c14aa68d`.
- CI for the new commit has not yet appeared in the connector at the time of this audit.
- Production Realtime publication and property change trigger were inspected separately and remain consistent with the intended architecture.

## Release rule

Do not merge this branch into `release/eyesite-definitive` or `main` until CI and controlled runtime validation pass.
