-- Fix production realtime invalidation trigger column mapping.
-- The live feed table uses property_id / accion, while the trigger function
-- was still writing legacy names propiedad_id / operacion.

create or replace function public.emit_propiedad_cambio()
returns trigger
language plpgsql
security definer
set search_path to public, pg_temp
as $$
begin
  insert into public.propiedades_cambios(property_id, accion)
  values (
    case when tg_op = 'DELETE' then old.id else new.id end,
    tg_op
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function public.emit_propiedad_cambio() from public, anon, authenticated;
