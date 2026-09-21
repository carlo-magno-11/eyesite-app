-- EYESITE security hardening:
-- A normal user may create and read their own property submission,
-- but must not be able to change its state, owner, or linked property.
-- Approval/rejection and all administrative edits remain server-side/admin-only.

drop policy if exists "solicitudes_update_own_or_admin"
on public.solicitudes_propiedades;

create policy "solicitudes_update_admin_only"
on public.solicitudes_propiedades
for update
to authenticated
using (is_admin())
with check (is_admin());
