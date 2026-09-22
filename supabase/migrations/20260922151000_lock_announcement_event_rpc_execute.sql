revoke execute on function public.registrar_anuncio_evento(uuid,text) from anon;
revoke execute on function public.registrar_anuncio_evento(uuid,text) from public;
grant execute on function public.registrar_anuncio_evento(uuid,text) to authenticated;
