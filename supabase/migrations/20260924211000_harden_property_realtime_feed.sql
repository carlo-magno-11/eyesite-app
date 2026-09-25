-- EYESITE: harden property realtime change feed.
-- Applied to production on 2026-09-24 before this migration record was added.
-- Keep the trigger SECURITY DEFINER because it writes to the protected change feed.
-- The trigger function itself is not an RPC API and must not be executable by clients.

drop policy if exists "propiedades_cambios_public_select" on public.propiedades_cambios;
drop policy if exists "public can read property change events" on public.propiedades_cambios;

create policy "public can read property change events"
  on public.propiedades_cambios
  for select
  to anon, authenticated
  using (true);

revoke execute on function public.emit_propiedad_cambio() from anon, authenticated, public;
