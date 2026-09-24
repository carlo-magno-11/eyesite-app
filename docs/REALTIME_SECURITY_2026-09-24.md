# EYESITE — Realtime security follow-up — 2026-09-24

## Verified

Production contains the property change feed used by the app to invalidate the public property cache:

- `public.propiedades_cambios`: present.
- Property trigger: present and emitting change events.
- Realtime publication: enabled for `propiedades_cambios`.
- Client read policy: one SELECT policy for `anon, authenticated`.
- `emit_propiedad_cambio()`: remains SECURITY DEFINER for trigger execution, but EXECUTE is revoked from `anon`, `authenticated`, and `public`.

## Why this was changed

Supabase advisors correctly identified that a SECURITY DEFINER trigger function in the exposed `public` schema was callable as an RPC. That was unnecessary: the application only needs the database trigger to invoke the function.

The same advisor pass also detected duplicate permissive SELECT policies on `propiedades_cambios`. They were consolidated into one policy.

## Intentional remaining advisor warnings

Administrative RPCs named `admin_*` remain SECURITY DEFINER and callable by authenticated clients because they are the server-side moderation boundary. Their authorization checks must remain inside those functions; they are not replaced by direct client writes.

`pg_net` in `public` and leaked-password protection are separate hardening items and were not changed blindly in this pass.

## Verification

After the change:

- `anon` EXECUTE on `emit_propiedad_cambio()`: false.
- `authenticated` EXECUTE: false.
- `public` EXECUTE: false.
- Exactly one SELECT policy remains on `propiedades_cambios`.
