-- EYESITE: preferencias y estado de entrega de comunicaciones
alter table public.profiles
  add column if not exists notificaciones_push boolean not null default true,
  add column if not exists notificaciones_in_app boolean not null default true,
  add column if not exists anuncios_push boolean not null default true;

alter table public.notificaciones
  add column if not exists push_status text not null default 'pending',
  add column if not exists push_attempts integer not null default 0,
  add column if not exists push_next_retry_at timestamptz;

alter table public.anuncios
  add column if not exists push_status text not null default 'pending',
  add column if not exists push_attempts integer not null default 0,
  add column if not exists push_next_retry_at timestamptz;

update public.notificaciones n
set push_status = case
  when n.push_sent_at is not null then 'sent'
  when exists (
    select 1 from public.profiles p
    where p.id = n.user_id
      and coalesce(p.notificaciones_push, true)
      and p.expo_push_token is not null
      and p.expo_push_token <> ''
  ) then 'pending'
  else 'not_configured'
end
where n.push_status = 'pending';

update public.anuncios
set push_status = case
  when push_sent_at is not null then 'sent'
  else 'pending'
end
where push_status = 'pending';

alter table public.notificaciones
  drop constraint if exists notificaciones_push_status_check;
alter table public.notificaciones
  add constraint notificaciones_push_status_check
  check (push_status in ('pending','sent','error','not_configured'));

alter table public.anuncios
  drop constraint if exists anuncios_push_status_check;
alter table public.anuncios
  add constraint anuncios_push_status_check
  check (push_status in ('pending','sent','error','not_configured'));

create index if not exists idx_notificaciones_push_retry
  on public.notificaciones (push_next_retry_at)
  where push_status in ('pending','error');

create index if not exists idx_anuncios_push_retry
  on public.anuncios (push_next_retry_at)
  where push_status in ('pending','error');

comment on column public.profiles.notificaciones_push is 'Permite push de notificaciones personales.';
comment on column public.profiles.notificaciones_in_app is 'Permite recibir notificaciones dentro de EYESITE.';
comment on column public.profiles.anuncios_push is 'Permite push de anuncios generales.';
comment on column public.notificaciones.push_status is 'Estado independiente del envío push; no afecta la entrega in-app.';
comment on column public.anuncios.push_status is 'Estado del envío push del anuncio.';
