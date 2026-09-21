-- EYESITE: consolidate overlapping profiles RLS policies without changing access semantics.
-- Users can read/update their own profile while admins can read/update all profiles.
-- Identity, role and access-state protections remain enforced by the existing trigger/policies.
drop policy if exists profiles_select_admin on public.profiles;
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_authenticated on public.profiles
for select to authenticated
using ((select is_admin()) or (select auth.uid()) = id);

drop policy if exists profiles_update_admin on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_authenticated on public.profiles
for update to authenticated
using ((select is_admin()) or (select auth.uid()) = id)
with check (
  (select is_admin())
  or (
    (select auth.uid()) = id
    and coalesce(role,'user') = coalesce((select current_profile_role((select auth.uid()))),'user')
    and coalesce(estado,'pendiente') = coalesce((select current_profile_estado((select auth.uid()))),'pendiente')
  )
);