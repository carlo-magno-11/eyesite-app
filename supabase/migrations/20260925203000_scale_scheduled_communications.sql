-- EYESITE scheduler scalability hardening
-- Prevent overlapping cron invocations and avoid regenerating announcement
-- delivery rows on every minute tick.
--
-- Applied to production before committing this migration:
-- project xhvpvpvtkdgnnxdwdrkn

create table if not exists public.eyesite_scheduler_lock (
  id smallint primary key,
  locked_until timestamptz
);

insert into public.eyesite_scheduler_lock(id, locked_until)
values (1, null)
on conflict (id) do nothing;

alter table public.eyesite_scheduler_lock enable row level security;
revoke all on table public.eyesite_scheduler_lock from anon, authenticated;

alter table public.anuncios
  add column if not exists entregas_generadas_at timestamptz;

create index if not exists idx_anuncios_entregas_generacion
  on public.anuncios (estado_publicacion, activa, entregas_generadas_at)
  where estado_publicacion = 'publicado'
    and activa = true
    and entregas_generadas_at is null;

create or replace function public.claim_eyesite_scheduler(
  p_lease_seconds integer default 90
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_claimed boolean := false;
begin
  if coalesce(
    current_setting('request.jwt.claim.role', true),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'),
    ''
  ) <> 'service_role' then
    raise exception 'Solo el servicio del scheduler puede reclamar el lock';
  end if;

  update public.eyesite_scheduler_lock
  set locked_until = now()
    + make_interval(secs => greatest(30, least(p_lease_seconds, 300)))
  where id = 1
    and (locked_until is null or locked_until <= now())
  returning true into v_claimed;

  return coalesce(v_claimed, false);
end;
$$;

create or replace function public.release_eyesite_scheduler()
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if coalesce(
    current_setting('request.jwt.claim.role', true),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'),
    ''
  ) <> 'service_role' then
    raise exception 'Solo el servicio del scheduler puede liberar el lock';
  end if;

  update public.eyesite_scheduler_lock
  set locked_until = null
  where id = 1;

  return true;
end;
$$;

revoke all on function public.claim_eyesite_scheduler(integer)
  from public, anon, authenticated;
revoke all on function public.release_eyesite_scheduler()
  from public, anon, authenticated;

grant execute on function public.claim_eyesite_scheduler(integer)
  to service_role;
grant execute on function public.release_eyesite_scheduler()
  to service_role;
