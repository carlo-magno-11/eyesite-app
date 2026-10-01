# EYESITE — Security Audit Update — 2026-09-25

## Scope
Security review of Supabase Storage, SECURITY DEFINER RPCs, Edge Functions, Auth findings, and legacy media buckets on the commercial branch.

## Applied hardening
Migration:
- `supabase/migrations/20260925070000_revoke_trigger_notification_execute.sql`

Change:
- Revoked direct EXECUTE on `public.notify_property_request_created()` from `public`, `anon`, and `authenticated`.
- The PostgreSQL trigger remains usable by the database; only direct RPC/API invocation was removed.

Security Advisor after the change:
- SECURITY DEFINER executable warning count reduced from 27 to 26.
- Remaining SECURITY DEFINER functions are primarily intentional admin/user RPC entry points and must be reviewed individually rather than revoked blindly.

## Storage findings
Current buckets include:
- `eyesite-media`: public, 15 objects; used for property media and therefore currently exposes objects publicly.
- `eyesite-private`: private, 25 MB limit; restricted policies for users/admins.
- `eyesite-staging`: private, 100 MB limit; owner/admin policies.
- Legacy public buckets remain: `documentos`, `fotos`, `fotos-propiedades`, `kmz_kml`, `pdfs`, `propiedades`, `solicitudes`, `videos`.

Observed objects currently exist in `fotos-propiedades` (42) and `eyesite-media` (15). No current objects were observed in the other listed legacy buckets.

### Important decision
Do NOT make legacy public buckets private or delete them yet. The repository search did not establish all historical consumers, and changing them blindly could break existing published media. Before cleanup, map every bucket reference in app/admin/Edge Functions and verify database URLs.

## Private-document boundary
`eyesite-private` is non-public and has owner/admin policies. `get-property-document` uses signed URLs rather than public object URLs. This boundary should remain intact.

## Staging boundary
`eyesite-staging` is non-public and owner/admin controlled. It contains recent submission assets and must not be made public.

## Remaining security work
1. Audit every remaining SECURITY DEFINER function body for admin/ownership checks and safe search_path.
2. Harden `send-notification` payload validation without weakening authorization.
3. Verify all Edge Functions with `verify_jwt=false` have justified manual authentication.
4. Map legacy public storage buckets to all code/database consumers before any migration.
5. Review Auth leaked-password protection; current Advisor reports it disabled.
6. Review `pg_net` in public schema; do not move it until dependencies are confirmed.
7. Verify announcements/publicity cannot expose draft/scheduled/private content.
8. Re-run Security Advisor after each intentional hardening migration.

## Gate
No merge to `main` until security review, CI, and physical iOS/Android/Web tests pass.
