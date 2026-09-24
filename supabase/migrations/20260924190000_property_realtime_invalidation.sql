-- EYESITE: safe realtime invalidation channel for public property reads
create table if not exists public.propiedades_cambios (
  id bigint generated always as identity primary key,
  propiedad_id uuid,
  operacion text not null check (operacion in ('INSERT','UPDATE','DELETE')),
  changed_at timestamptz not null default now()
);

create index if not exists propiedades_cambios_changed_at_idx
  on public.propiedades_cambios (changed_at desc);

alter table public.propiedades_cambios enable row level security;

drop policy if exists "public can read property change events" on public.propiedades_cambios;
create policy "public can read property change events"
  on public.propiedades_cambios for select to anon, authenticated using (true);

revoke insert, update, delete on public.propiedades_cambios from anon, authenticated;

create or replace function public.emit_propiedad_cambio()
returns trigger language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.propiedades_cambios(propiedad_id, operacion)
  values (case when tg_op = 'DELETE' then old.id else new.id end, tg_op);
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists trg_propiedades_cambio on public.propiedades;
create trigger trg_propiedades_cambio
after insert or update or delete on public.propiedades
for each row execute function public.emit_propiedad_cambio();

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'propiedades_cambios'
  ) then
    alter publication supabase_realtime add table public.propiedades_cambios;
  end if;
end $$;
