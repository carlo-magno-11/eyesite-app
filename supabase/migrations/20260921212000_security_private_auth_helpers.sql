-- EYESITE — Keep authorization helpers private while preserving RLS/storage behavior
-- 2026-09-21
--
-- Public SECURITY DEFINER helpers are not exposed as RPC endpoints.
-- RLS policies use equivalent helpers in the non-exposed private schema.

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
grant usage on schema private to authenticated, anon;

revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated, anon;

revoke all on function private.current_profile_role(uuid) from public, anon;
grant execute on function private.current_profile_role(uuid) to authenticated;

revoke all on function private.current_profile_estado(uuid) from public, anon;
grant execute on function private.current_profile_estado(uuid) to authenticated;

-- Preserve the original policy roles while replacing only is_admin() calls.
do $$
declare
  r record;
  v_qual text;
  v_check text;
  v_roles text;
begin
  for r in
    select schemaname, tablename, policyname, cmd, roles, qual, with_check
    from pg_policies
    where (coalesce(qual,'') ilike '%is_admin()%' or coalesce(with_check,'') ilike '%is_admin()%')
      and schemaname in ('public','storage')
  loop
    v_qual := regexp_replace(
      coalesce(r.qual,''),
      '(^|[^[:alnum:]_])is_admin\\(\\)',
      '\\1private.is_admin()',
      'g'
    );
    v_check := regexp_replace(
      coalesce(r.with_check,''),
      '(^|[^[:alnum:]_])is_admin\\(\\)',
      '\\1private.is_admin()',
      'g'
    );
    v_roles := array_to_string(r.roles, ', ');

    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);

    if r.cmd = 'SELECT' then
      execute format(
        'create policy %I on %I.%I for select to %s using (%s)',
        r.policyname, r.schemaname, r.tablename, v_roles, v_qual
      );
    elsif r.cmd = 'INSERT' then
      execute format(
        'create policy %I on %I.%I for insert to %s with check (%s)',
        r.policyname, r.schemaname, r.tablename, v_roles, v_check
      );
    elsif r.cmd = 'UPDATE' then
      execute format(
        'create policy %I on %I.%I for update to %s using (%s) with check (%s)',
        r.policyname, r.schemaname, r.tablename, v_roles, v_qual, v_check
      );
    elsif r.cmd = 'DELETE' then
      execute format(
        'create policy %I on %I.%I for delete to %s using (%s)',
        r.policyname, r.schemaname, r.tablename, v_roles, v_qual
      );
    end if;
  end loop;
end $$;

-- Protect profile role/state during self-update without exposing the old
-- helper functions through public RPC.
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

-- The public announcement feed must remain available to anonymous users.
drop policy if exists anuncios_select_publicados on public.anuncios;
create policy anuncios_select_publicados
on public.anuncios
for select
to anon, authenticated
using (activa = true or (select private.is_admin()));


-- Anonymous visitors can read only published/active announcements through RLS.
grant select on table public.anuncios to anon;
