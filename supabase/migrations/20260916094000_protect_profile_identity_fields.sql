create or replace function public.protect_profile_identity_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.id := old.id;
    new.email := old.email;
    new.role := old.role;
    new.estado := old.estado;
    new.status := old.status;
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_protect_profile_identity_fields on public.profiles;
create trigger trg_protect_profile_identity_fields
before update on public.profiles
for each row
execute function public.protect_profile_identity_fields();

revoke execute on function public.protect_profile_identity_fields() from public, anon, authenticated;
