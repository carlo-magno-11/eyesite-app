-- EYESITE Commercial CRM foundation
-- Draft for feature/eyesite-commercial-crm.
-- IMPORTANT: this file is intentionally not applied to production yet.
-- It adds telemetry, saved searches, prospect CRM relations, and admin RPCs.

create extension if not exists pgcrypto;

create table if not exists public.property_events (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.propiedades(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (
    event_type in (
      'view',
      'favorite',
      'contact',
      'whatsapp_click',
      'share',
      'map_open',
      'search_match'
    )
  ),
  source text not null default 'app',
  campaign text,
  session_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists property_events_property_created_idx
  on public.property_events(property_id, created_at desc);
create index if not exists property_events_user_created_idx
  on public.property_events(user_id, created_at desc);
create index if not exists property_events_type_created_idx
  on public.property_events(event_type, created_at desc);

create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nombre text not null default 'Mi búsqueda',
  min_price numeric,
  max_price numeric,
  min_surface numeric,
  max_surface numeric,
  municipio text,
  tipo text,
  objetivo text,
  plazo_compra text,
  financiamiento text,
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint saved_searches_price_range_chk check (
    min_price is null or max_price is null or min_price <= max_price
  ),
  constraint saved_searches_surface_range_chk check (
    min_surface is null or max_surface is null or min_surface <= max_surface
  )
);

create index if not exists saved_searches_user_active_idx
  on public.saved_searches(user_id, activa, updated_at desc);

create table if not exists public.prospectos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  nombre text,
  email text,
  telefono text,
  fuente text not null default 'app',
  estado text not null default 'nuevo' check (
    estado in (
      'nuevo',
      'contactado',
      'calificado',
      'seguimiento',
      'negociacion',
      'vendido',
      'perdido'
    )
  ),
  score integer not null default 0 check (score between 0 and 100),
  presupuesto numeric,
  zona_interes text,
  objetivo text,
  plazo_compra text,
  financiamiento text,
  ultimo_contacto_at timestamptz,
  proximo_seguimiento_at timestamptz,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists prospectos_estado_score_idx
  on public.prospectos(estado, score desc, updated_at desc);
create index if not exists prospectos_followup_idx
  on public.prospectos(proximo_seguimiento_at)
  where proximo_seguimiento_at is not null;

create table if not exists public.prospecto_propiedades (
  id uuid primary key default gen_random_uuid(),
  prospecto_id uuid not null references public.prospectos(id) on delete cascade,
  property_id uuid not null references public.propiedades(id) on delete cascade,
  interes text not null default 'interesado' check (
    interes in ('interesado','contactado','favorito','seguimiento','oferta','vendido','descartado')
  ),
  primer_contacto_at timestamptz not null default now(),
  ultimo_contacto_at timestamptz not null default now(),
  notas text,
  unique(prospecto_id, property_id)
);

create index if not exists prospecto_propiedades_property_idx
  on public.prospecto_propiedades(property_id, ultimo_contacto_at desc);
create index if not exists prospecto_propiedades_prospecto_idx
  on public.prospecto_propiedades(prospecto_id, ultimo_contacto_at desc);

create table if not exists public.prospecto_actividades (
  id uuid primary key default gen_random_uuid(),
  prospecto_id uuid not null references public.prospectos(id) on delete cascade,
  property_id uuid references public.propiedades(id) on delete set null,
  tipo text not null check (
    tipo in ('contacto','whatsapp','llamada','favorito','visita_solicitada','oferta','nota','sistema')
  ),
  descripcion text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists prospecto_actividades_prospecto_idx
  on public.prospecto_actividades(prospecto_id, created_at desc);

-- Only authenticated users may create their own commercial telemetry.
alter table public.property_events enable row level security;
alter table public.saved_searches enable row level security;
alter table public.prospectos enable row level security;
alter table public.prospecto_propiedades enable row level security;
alter table public.prospecto_actividades enable row level security;

revoke all on table public.property_events from anon, authenticated;
revoke all on table public.prospectos from anon, authenticated;
revoke all on table public.prospecto_propiedades from anon, authenticated;
revoke all on table public.prospecto_actividades from anon, authenticated;

grant select, insert, update, delete on table public.saved_searches to authenticated;

drop policy if exists saved_searches_select_own on public.saved_searches;
create policy saved_searches_select_own
  on public.saved_searches for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.estado = 'activa'
    )
  );

drop policy if exists saved_searches_insert_own on public.saved_searches;
create policy saved_searches_insert_own
  on public.saved_searches for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.estado = 'activa'
    )
  );

drop policy if exists saved_searches_update_own on public.saved_searches;
create policy saved_searches_update_own
  on public.saved_searches for update
  to authenticated
  using (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.estado = 'activa'
    )
  )
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.estado = 'activa'
    )
  );

drop policy if exists saved_searches_delete_own on public.saved_searches;
create policy saved_searches_delete_own
  on public.saved_searches for delete
  to authenticated
  using (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.estado = 'activa'
    )
  );

create or replace function public.track_property_event(
  p_property_id uuid,
  p_event_type text,
  p_source text default 'app',
  p_campaign text default null,
  p_session_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path to public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'Autenticación requerida';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = v_user_id and p.estado = 'activa'
  ) then
    raise exception 'Perfil activo requerido';
  end if;

  if not exists (
    select 1 from public.propiedades_publicas p
    where p.id = p_property_id and p.estado = 'activa' and coalesce(p.activa, true)
  ) then
    raise exception 'Propiedad pública no disponible';
  end if;

  if lower(trim(p_event_type)) = 'view'
     and exists (
       select 1
       from public.property_events pe
       where pe.property_id = p_property_id
         and pe.user_id = v_user_id
         and pe.event_type = 'view'
         and pe.created_at > now() - interval '30 seconds'
     ) then
    select pe.id
    into v_id
    from public.property_events pe
    where pe.property_id = p_property_id
      and pe.user_id = v_user_id
      and pe.event_type = 'view'
      and pe.created_at > now() - interval '30 seconds'
    order by pe.created_at desc
    limit 1;

    return v_id;
  end if;

  insert into public.property_events (
    property_id, user_id, event_type, source, campaign, session_id, metadata
  )
  values (
    p_property_id,
    v_user_id,
    lower(trim(p_event_type)),
    coalesce(nullif(trim(p_source), ''), 'app'),
    nullif(trim(p_campaign), ''),
    nullif(trim(p_session_id), ''),
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.track_property_event(uuid, text, text, text, text, jsonb) from public, anon;
grant execute on function public.track_property_event(uuid, text, text, text, text, jsonb) to authenticated;

create or replace function public.registrar_prospecto_desde_interes(
  p_property_id uuid,
  p_source text default 'app',
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path to public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_prospecto_id uuid;
begin
  if v_user_id is null then
    raise exception 'Autenticación requerida';
  end if;

  select * into v_profile
  from public.profiles
  where id = v_user_id and estado = 'activa';

  if not found then
    raise exception 'Perfil activo requerido';
  end if;

  if not exists (
    select 1 from public.propiedades_publicas p
    where p.id = p_property_id and p.estado = 'activa' and coalesce(p.activa, true)
  ) then
    raise exception 'Propiedad pública no disponible';
  end if;

  insert into public.prospectos (
    user_id, nombre, email, telefono, fuente, presupuesto, zona_interes,
    ultimo_contacto_at, updated_at
  )
  values (
    v_user_id,
    v_profile.nombre,
    v_profile.email,
    v_profile.telefono,
    coalesce(nullif(trim(p_source), ''), 'app'),
    nullif(regexp_replace(coalesce(v_profile.presupuesto, ''), '[^0-9.]', '', 'g'), '')::numeric,
    v_profile.ciudad,
    now(),
    now()
  )
  on conflict (user_id) do update set
    nombre = excluded.nombre,
    email = excluded.email,
    telefono = excluded.telefono,
    presupuesto = coalesce(excluded.presupuesto, prospectos.presupuesto),
    zona_interes = coalesce(excluded.zona_interes, prospectos.zona_interes),
    fuente = coalesce(nullif(excluded.fuente, ''), prospectos.fuente),
    ultimo_contacto_at = now(),
    updated_at = now()
  returning id into v_prospecto_id;

  insert into public.prospecto_propiedades (
    prospecto_id, property_id, interes, ultimo_contacto_at
  )
  values (v_prospecto_id, p_property_id, 'contactado', now())
  on conflict (prospecto_id, property_id) do update set
    interes = 'contactado',
    ultimo_contacto_at = now();

  insert into public.prospecto_actividades (
    prospecto_id, property_id, tipo, descripcion, metadata
  )
  values (
    v_prospecto_id,
    p_property_id,
    'contacto',
    'Contacto iniciado desde EYESITE',
    coalesce(p_metadata, '{}'::jsonb)
  );

  update public.prospectos
  set score = least(
    100,
    10
    + case when presupuesto is not null then 15 else 0 end
    + case when zona_interes is not null and btrim(zona_interes) <> '' then 10 else 0 end
    + (
      select least(25, count(*) * 5)
      from public.prospecto_propiedades pp
      where pp.prospecto_id = v_prospecto_id
        and pp.interes in ('contactado','favorito','oferta','vendido')
    )
    + (
      select least(20, count(*) * 2)
      from public.prospecto_actividades pa
      where pa.prospecto_id = v_prospecto_id
    )
    + case when ultimo_contacto_at > now() - interval '7 days' then 10 else 0 end
  ),
  updated_at = now()
  where id = v_prospecto_id;

  return v_prospecto_id;
end;
$$;

revoke all on function public.registrar_prospecto_desde_interes(uuid, text, jsonb) from public, anon;
grant execute on function public.registrar_prospecto_desde_interes(uuid, text, jsonb) to authenticated;

create or replace function public.admin_list_prospectos()
returns table (
  id uuid,
  user_id uuid,
  nombre text,
  email text,
  telefono text,
  fuente text,
  estado text,
  score integer,
  presupuesto numeric,
  zona_interes text,
  objetivo text,
  plazo_compra text,
  financiamiento text,
  ultimo_contacto_at timestamptz,
  proximo_seguimiento_at timestamptz,
  notas text,
  created_at timestamptz,
  updated_at timestamptz,
  propiedades_interesadas bigint,
  actividades bigint
)
language sql
security definer
set search_path to public, pg_temp
as $$
  select
    p.id, p.user_id, p.nombre, p.email, p.telefono, p.fuente, p.estado, p.score,
    p.presupuesto, p.zona_interes, p.objetivo, p.plazo_compra, p.financiamiento,
    p.ultimo_contacto_at, p.proximo_seguimiento_at, p.notas, p.created_at, p.updated_at,
    (select count(*) from public.prospecto_propiedades pp where pp.prospecto_id = p.id),
    (select count(*) from public.prospecto_actividades pa where pa.prospecto_id = p.id)
  from public.prospectos p
  where public.is_admin()
  order by p.score desc, p.updated_at desc;
$$;

revoke all on function public.admin_list_prospectos() from public, anon;
grant execute on function public.admin_list_prospectos() to authenticated;

create or replace function public.admin_update_prospecto(
  p_prospecto_id uuid,
  p_estado text default null,
  p_score integer default null,
  p_proximo_seguimiento_at timestamptz default null,
  p_notas text default null
)
returns jsonb
language plpgsql
security definer
set search_path to public, pg_temp
as $$
declare
  v_exists boolean;
begin
  if not public.is_admin() then
    raise exception 'Solo administradores pueden actualizar prospectos';
  end if;

  select exists(select 1 from public.prospectos where id = p_prospecto_id)
    into v_exists;

  if not v_exists then
    raise exception 'Prospecto no encontrado';
  end if;

  update public.prospectos
  set
    estado = case
      when p_estado is null then estado
      when p_estado in ('nuevo','contactado','calificado','seguimiento','negociacion','vendido','perdido')
        then p_estado
      else estado
    end,
    score = case
      when p_score is null then score
      else greatest(0, least(100, p_score))
    end,
    proximo_seguimiento_at = p_proximo_seguimiento_at,
    notas = p_notas,
    updated_at = now()
  where id = p_prospecto_id;

  insert into public.prospecto_actividades (
    prospecto_id, tipo, descripcion, metadata
  )
  values (
    p_prospecto_id,
    'nota',
    'Actualización administrativa del prospecto',
    jsonb_build_object(
      'estado', p_estado,
      'score', p_score,
      'seguimiento', p_proximo_seguimiento_at
    )
  );

  return jsonb_build_object('ok', true, 'id', p_prospecto_id);
end;
$$;

revoke all on function public.admin_update_prospecto(uuid, text, integer, timestamptz, text) from public, anon;
grant execute on function public.admin_update_prospecto(uuid, text, integer, timestamptz, text) to authenticated;
