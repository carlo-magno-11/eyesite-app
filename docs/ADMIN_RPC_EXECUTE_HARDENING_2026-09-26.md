# EYESITE — Admin RPC EXECUTE hardening — 2026-09-26

## Scope

Production Supabase project xhvpvpvtkdgnnxdwdrkn was reviewed before changing privileges.

## Change applied

Migration version 20260926232604 (harden_admin_rpc_public_execute_20260926) removes implicit PUBLIC execution from all public.admin_* SECURITY DEFINER functions.

The migration then preserves the existing authenticated EXECUTE grants instead of broadening access.

No business data, property rows, profiles, media, or notification rows were modified.

## Verification

Post-change privilege checks confirmed:

- PUBLIC EXECUTE: false for all admin RPCs.
- anon EXECUTE: false for all admin RPCs.
- authenticated EXECUTE: preserved only where it existed before the migration.
- admin_aprobar_solicitud remains unavailable to authenticated, matching its previous state.
- A controlled SET LOCAL ROLE authenticated call to admin_health_snapshot() failed with not authorized, confirming the function's internal admin boundary rejects a non-admin caller.

## Existing advisor findings intentionally retained

Supabase Security Advisor still reports:

- 26 authenticated-callable SECURITY DEFINER functions. These are intentional admin/user RPC boundaries and contain authorization checks; they should not be revoked generically because the admin panel depends on them.
- pg_net in public; this is part of the existing scheduler architecture and requires a separate migration/design review before moving.
- Five internal RLS-enabled tables without policies; these are intentionally non-public/internal and were not changed blindly.
- Leaked password protection disabled; this is an Auth configuration setting rather than a database migration and should be enabled through the appropriate Supabase Auth configuration after checking the current project behavior.

## Release rule

This change is already applied to production and has a matching migration file in the working branch. It must remain in the branch history before the branch is promoted to release/eyesite-definitive.

main and release/eyesite-definitive were not modified by this change.
