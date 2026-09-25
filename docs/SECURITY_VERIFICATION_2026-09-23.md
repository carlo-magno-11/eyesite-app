# EYESITE — Security verification 2026-09-23

## Verified in production

- Supabase project `xhvpvpvtkdgnnxdwdrkn` is ACTIVE_HEALTHY.
- `public.notify_property_request_created()` remains SECURITY DEFINER because it is used by the property-request trigger.
- Anonymous RPC execution for that trigger helper was revoked and re-verified:
  - `anon`: EXECUTE = false
  - `authenticated`: EXECUTE = true
- The change is isolated in migration:
  `supabase/migrations/20260923180000_security_revoke_notify_property_request_anon.sql`

## Remaining security findings

Supabase Security Advisor still reports:
- `pg_net` installed in `public`.
- 22 SECURITY DEFINER functions executable by authenticated users. These include admin RPCs that are intentionally used by the admin panel and must enforce `is_admin()` internally; they should not be revoked blindly.
- Leaked-password protection is disabled.

These findings are not marked resolved until each item is independently verified.

## CI status

The latest known PR #19 commit `469dc2f6944c72eb5a1eedc149e67fa59f1f2fbd` has a completed GitHub Actions run with conclusion `success`.

The security migration is a new commit after that run, so CI must be checked again before merging it.
