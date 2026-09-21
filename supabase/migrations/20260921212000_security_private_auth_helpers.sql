-- EYESITE — Keep authorization helpers private while preserving RLS/storage behavior
-- 2026-09-21
--
-- Public SECURITY DEFINER helpers such as public.is_admin() are not exposed as
-- RPCs. RLS policies use equivalent helpers in the non-exposed private schema.

create schema if not exists private;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

create or replace function private.current_profile_role(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = p_user_id;
$$;

create or replace function private.current_profile_estado(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select estado from public.profiles where id = p_user_id;
$$;

revoke all on schema private from public;
grant usage on schema private to authenticated;

revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

revoke all on function private.current_profile_role(uuid) from public, anon;
grant execute on function private.current_profile_role(uuid) to authenticated;

revoke all on function private.current_profile_estado(uuid) from public, anon;
grant execute on function private.current_profile_estado(uuid) to authenticated;

-- RLS policies that need admin checks use the private helper.
-- Public read policies remain available to anon where appropriate.
drop policy if exists "anuncios_select_publicados" on public.anuncios;
create policy "anuncios_select_publicados"
on public.anuncios
for select
to anon, authenticated
using (activa = true or (select private.is_admin()));

drop policy if exists profiles_update_authenticated on public.profiles;
create policy profiles_update_authenticated
on public.profiles
for update
to authenticated
using ((select private.is_admin()) or (select auth.uid()) = id)
with check (
  (select private.is_admin())
  or (
    (select auth.uid()) = id
    and coalesce(role,'user') = coalesce(
      (select private.current_profile_role((select auth.uid()))),'user'
    )
    and coalesce(estado,'pendiente') = coalesce(
      (select private.current_profile_estado((select auth.uid()))),'pendiente'
    )
  )
);
