-- EYESITE: secure realtime change feed for public property refreshes.
-- The app must never subscribe to the protected propiedades table.
create table if not exists public.propiedades_cambios (
  property_id uuid primary key,
  accion text not null default 'update' check (accion in ('insert','update','delete')),
  changed_at timestamptz not null default now()
);

alter table public.propiedades_cambios enable row level security;
grant select on public.propiedades_cambios to anon, authenticated;

drop policy if exists propiedades_cambios_public_select on public.propiedades_cambios;
create policy propiedades_cambios_public_select on public.propiedades_cambios
for select to anon, authenticated using (true);

create or replace function public.notify_propiedad_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  insert into public.propiedades_cambios(property_id, accion, changed_at)
  values (
    case when tg_op = 'DELETE' then old.id else new.id end,
    lower(tg_op),
    now()
  )
  on conflict (property_id) do update
    set accion = excluded.accion,
        changed_at = excluded.changed_at;
  return case when tg_op = 'DELETE' then old else new end;
end;
$function$;

drop trigger if exists trg_propiedades_cambios on public.propiedades;
create trigger trg_propiedades_cambios
after insert or update or delete on public.propiedades
for each row execute function public.notify_propiedad_change();

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime'
      and schemaname='public'
      and tablename='propiedades_cambios'
  ) then
    alter publication supabase_realtime add table public.propiedades_cambios;
  end if;
end $$;