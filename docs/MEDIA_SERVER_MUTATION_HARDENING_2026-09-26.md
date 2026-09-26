# EYESITE — Server-side media mutation hardening (2026-09-26)

## Scope

Working branch: `fix/eyesite-platform-security-20260925`

This change hardens the privileged property mutation boundary without changing `main`, `release/eyesite-definitive`, or Supabase production.

## Changes

- Added `supabase/migrations/20260926190000_harden_admin_property_media.sql`.
- Added private helper `private.assert_public_property_media_payload(jsonb,jsonb)`.
- `admin_create_property` now validates public media references before inserting a catalog property.
- `admin_update_property` validates media only when media fields are included in the edit payload.
- Newly introduced public media references must point to the EYESITE `eyesite-media` public bucket.
- During an update, an already-existing legacy reference may be preserved only when it exactly matches the current stored media reference for that property. It cannot be introduced as new media.
- Private documents such as `archivos`, `pdfs`, and `kmz_kml` are intentionally excluded from this public-media validator.
- Existing legacy rows are not rewritten automatically.
- No production migration was applied.

## Why

Client-side validation in `public/admin.js` improves UX but is not a security boundary. The privileged PostgreSQL RPCs must independently reject staging/private references and prevent new legacy/external media references from entering the public catalog.

The update rule deliberately distinguishes **preserving old data** from **introducing new data**. This avoids breaking unrelated edits to historical properties while maintaining a strict contract for new or replaced public media.

## Current known media repair

`Casa prueba 6` has a legacy/staging media reference. The correct repair remains controlled promotion/re-upload into `eyesite-media`; `lib/property-media.ts` must not be weakened to expose staging/private media.

Other active legacy data was also inventoried. Some older rows contain external public image references (for example Unsplash). Those references are not accepted as new media by the hardened RPC; they must be replaced through the controlled admin media workflow before being treated as EYESITE-owned catalog media.

## Verification state

- Commit `142cd925`: CI fully green (TypeScript, lint, tests, Web export, iOS native generation, Privacy Manifest).
- Commit `e38e3aba`: CI fully green.
- Commit `3e48dfb3`: documentation-only follow-up.
- Current media-hardening commits after the legacy-preservation refinement: `bf233805` and `886fc19a`.
- The latest commit's GitHub Actions run has not yet appeared in the connector at the time of this audit.
- Production Realtime publication and property change trigger were inspected separately and remain consistent with the intended architecture.
- Production `admin_create_property` and `admin_update_property` were compared against the branch replacements; the existing admin gates and update allow-list are preserved.

## Release rule

Do not merge this branch into `release/eyesite-definitive` or `main` until the latest CI and controlled runtime validation pass.
