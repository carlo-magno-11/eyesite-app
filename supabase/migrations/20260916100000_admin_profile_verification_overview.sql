create or replace function public.admin_list_profiles()
returns table (
  id uuid,
  email text,
  role text,
  estado text,
  nombre text,
  telefono text,
  ciudad text,
  presupuesto text,
  terminos_aceptados boolean,
  terminos_version text,
  created_at timestamptz,
  updated_at timestamptz,
  email_confirmed_at timestamptz
)
language sql
security definer
set search_path = public, auth
as $function$
  select
    p.id,
    p.email,
    p.role,
    p.estado,
    p.nombre,
    p.telefono,
    p.ciudad,
    p.presupuesto,
    p.terminos_aceptados,
    p.terminos_version,
    p.created_at,
    p.updated_at,
    u.email_confirmed_at
  from public.profiles p
  left join auth.users u on u.id = p.id
  where public.is_admin()
  order by p.created_at desc nulls last;
$function$;

revoke execute on function public.admin_list_profiles() from public, anon;
grant execute on function public.admin_list_profiles() to authenticated;
