-- EYESITE: lectura administrativa segura de propiedades
-- Evita depender de propiedades_admin con security_invoker=true,
-- cuyo RLS de propiedades limita la lectura administrativa.
create or replace function public.admin_list_properties()
returns setof public.propiedades
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.*
  from public.propiedades as p
  where public.is_admin();
$$;

revoke all on function public.admin_list_properties() from public;
grant execute on function public.admin_list_properties() to authenticated;
