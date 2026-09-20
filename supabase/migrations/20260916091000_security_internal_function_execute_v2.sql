-- EYESITE security hardening v2: remove public EXECUTE from internal trigger helpers
-- Date: 2026-09-16

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.eyesite_audit_trigger() from public, anon, authenticated;
revoke execute on function public.eyesite_price_drop_notification() from public, anon, authenticated;
revoke execute on function public.sync_propiedad_publication_status() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

create or replace function public.current_profile_role(uid uuid)
returns text
language sql
stable
security definer
set search_path = public
as $function$
  select role from public.profiles
  where id = auth.uid() and id = uid
  limit 1;
$function$;

create or replace function public.current_profile_estado(uid uuid)
returns text
language sql
stable
security definer
set search_path = public
as $function$
  select estado from public.profiles
  where id = auth.uid() and id = uid
  limit 1;
$function$;

revoke execute on function public.current_profile_role(uuid) from public, anon;
revoke execute on function public.current_profile_estado(uuid) from public, anon;
grant execute on function public.current_profile_role(uuid) to authenticated;
grant execute on function public.current_profile_estado(uuid) to authenticated;
