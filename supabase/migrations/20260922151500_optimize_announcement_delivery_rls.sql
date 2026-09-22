drop policy if exists anuncio_entregas_select_own on public.anuncio_entregas;
create policy anuncio_entregas_select_own
on public.anuncio_entregas
for select to authenticated
using (user_id = (select auth.uid()) or public.is_admin());
