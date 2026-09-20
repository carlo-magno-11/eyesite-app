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
    u.id,
    coalesce(p.email, u.email),
    coalesce(p.role, 'user'),
    coalesce(p.estado, 'sin_perfil'),
    p.nombre,
    p.telefono,
    p.ciudad,
    p.presupuesto,
    p.terminos_aceptados,
    p.terminos_version,
    coalesce(p.created_at, u.created_at),
    p.updated_at,
    u.email_confirmed_at
  from auth.users u
  left join public.profiles p on p.id = u.id
  where public.is_admin()
  order by coalesce(p.created_at, u.created_at) desc nulls last;
$function$;
