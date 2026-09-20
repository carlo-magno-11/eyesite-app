drop policy if exists propiedades_select_own on public.propiedades;
create policy propiedades_select_own
on public.propiedades
for select
to authenticated
using ((select auth.uid()) = user_id);
