# EYESITE — Development progress 2026-09-23

## Verified without changing main

### Registration
Review of `release/eyesite-definitive` found that `register.tsx` collected name, phone, city and budget but did not pass them in `supabase.auth.signUp({ options.data })`. That meant `create-profile.tsx` could not reliably prefill those fields from `user_metadata`.

Fixed in commit `03717efa47febe890762794c08729ccfda7d38e` by sending:
- `nombre`
- `telefono`
- `ciudad`
- `presupuesto`

No changes to `main`.

### Supabase production verification
- Project is ACTIVE_HEALTHY.
- `profiles`: 5 rows; 5 active.
- `propiedades_publicas`: 10 rows.
- `solicitudes_propiedades`: 2 rows.
- `notificaciones`: 3 rows.
- `anuncios`: 1 row.
- `admin_list_properties()`: anon EXECUTE = false; authenticated EXECUTE = true.
- Push tokens currently registered: 0 of 5 profiles.

### Push conclusion
The application-side token registration path is present and uses the EAS project ID. The backend `send-notification` Edge Function is active and validates an active admin before sending through Expo Push.

A real installed iPhone/Android build is still required to obtain a device token and prove the end-to-end push path.

### Authentication
Code review confirms:
- registration redirect uses `https://auth.eyesite.mx/auth/callback` on web and `eyesite://auth/callback` natively;
- forgot-password uses `https://auth.eyesite.mx/auth/callback?type=recovery`;
- canonical native recovery screen is `app/reset-password.tsx`;
- the web callback processes `token_hash`, `code`, and `type`.

A real Gmail message is still required to prove delivery and the Hostinger callback in production.

## CI rule
The previously checked PR #19 commit `469dc2f...` had a successful GitHub Actions run. The newer registration commit is not yet associated with a completed workflow result, so it is NOT marked CI-green until GitHub runs and reports it.

## Production security hardening
The SECURITY DEFINER trigger helper `public.notify_property_request_created()` had anonymous RPC execution enabled. Anonymous EXECUTE was revoked in production and verified false.

The matching migration is in PR #20:
`supabase/migrations/20260923180000_security_revoke_notify_property_request_anon.sql`

## Do not do yet
- Do not merge PR #19 into `main`.
- Do not merge PR #20 until its CI and migration state are verified.
- Do not claim push is working until a physical device registers a token and receives a test push.
- Do not claim Gmail/Hostinger is working until a real confirmation/recovery email is tested.
