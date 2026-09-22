-- EYESITE: endurecer lectura de propiedades propias para cuentas suspendidas
-- Fecha: 2026-09-22

drop policy if exists propiedades_select_own on public.propiedades;

create policy propiedades_select_own
on public.propiedades
for select
to authenticated
using (
  (select private.is_active_user())
  and (select auth.uid()) = user_id
);
