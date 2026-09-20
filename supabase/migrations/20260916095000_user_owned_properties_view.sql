drop policy if exists propiedades_select_own on public.propiedades;
create policy propiedades_select_own
on public.propiedades
for select
to authenticated
using (user_id = auth.uid());

drop view if exists public.propiedades_mias;
create view public.propiedades_mias
with (security_invoker = true, security_barrier = true)
as
select
  id, codigo, titulo, tipo, municipio, direccion,
  superficie, unidad_superficie, frente, fondo,
  precio_actual, precio_mercado, precio_esperado, unidad_precio, moneda,
  estado, activa, descripcion, fotos, fotos_pro, portada_url,
  portada_tipo, tipo_portada, video_url, videos,
  latitud, longitud, created_at, updated_at
from public.propiedades
where user_id = auth.uid();

grant select on public.propiedades_mias to authenticated;
revoke all on public.propiedades_mias from anon;
