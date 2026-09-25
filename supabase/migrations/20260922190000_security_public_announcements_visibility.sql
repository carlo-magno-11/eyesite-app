-- EYESITE: restringe la lectura pública de anuncios a contenido realmente publicado y vigente.
-- La política coincide con el filtro de la app y evita exponer por API anuncios programados o expirados.

drop policy if exists anuncios_select_publicados on public.anuncios;

create policy anuncios_select_publicados
on public.anuncios
for select
to anon, authenticated
using (
  (
    activa = true
    and estado_publicacion = 'publicado'
    and programada_para <= now()
    and (
      fecha_expiracion is null
      or fecha_expiracion > now()
    )
  )
  or (select private.is_admin())
);
