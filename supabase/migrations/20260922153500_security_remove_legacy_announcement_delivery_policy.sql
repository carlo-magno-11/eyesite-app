-- Remove the legacy permissive policy superseded by the active-profile policy.
drop policy if exists anuncio_entregas_select_own on public.anuncio_entregas;
