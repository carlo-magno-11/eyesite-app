-- EYESITE security hardening v3: admin view becomes security-invoker
-- Normal users must never receive direct base-table access.

revoke select on table public.propiedades from anon;
grant select on table public.propiedades to authenticated;

drop policy if exists propiedades_public_select on public.propiedades;

alter view public.propiedades_admin
  set (security_invoker = true);

alter view public.propiedades_admin
  set (security_barrier = true);
