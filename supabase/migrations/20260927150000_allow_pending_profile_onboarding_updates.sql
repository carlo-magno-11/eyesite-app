-- EYESITE: allow pending users to complete their own onboarding profile
-- Security boundary: status/role remain immutable to non-admins via the existing
-- protect_profile_identity_fields trigger and the WITH CHECK policy below.

drop policy if exists profiles_update_authenticated on public.profiles;

create policy profiles_update_authenticated
on public.profiles
for update
to authenticated
using (
  (select private.is_admin())
  or (
    id = (select auth.uid())
    and (
      (select private.is_active_user())
      or coalesce(estado, 'pendiente') = 'pendiente'
    )
  )
)
with check (
  (select private.is_admin())
  or (
    id = (select auth.uid())
    and coalesce(role, 'user') = coalesce(
      (select private.current_profile_role((select auth.uid()))),
      'user'
    )
    and coalesce(estado, 'pendiente') = coalesce(
      (select private.current_profile_estado((select auth.uid()))),
      'pendiente'
    )
  )
);
