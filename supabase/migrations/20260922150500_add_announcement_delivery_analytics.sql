-- EYESITE: entrega y analítica por usuario para anuncios
create table if not exists public.anuncio_entregas (
  id uuid primary key default gen_random_uuid(),
  anuncio_id uuid not null references public.anuncios(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  push_status text not null default 'pending',
  push_attempts integer not null default 0,
  push_next_retry_at timestamptz,
  sent_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  push_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (anuncio_id,user_id),
  check (push_status in ('pending','sent','error','not_configured'))
);

alter table public.anuncio_entregas enable row level security;

drop policy if exists anuncio_entregas_select_own on public.anuncio_entregas;
create policy anuncio_entregas_select_own
on public.anuncio_entregas
for select to authenticated
using (user_id = auth.uid() or public.is_admin());

create index if not exists idx_anuncio_entregas_anuncio
on public.anuncio_entregas(anuncio_id,created_at desc);
create index if not exists idx_anuncio_entregas_user
on public.anuncio_entregas(user_id,created_at desc);
create index if not exists idx_anuncio_entregas_retry
on public.anuncio_entregas(push_next_retry_at)
where push_status in ('pending','error');

create or replace function public.registrar_anuncio_evento(
  p_announcement_id uuid,p_evento text
) returns boolean
language plpgsql security definer set search_path=public,pg_temp
as $$
begin
  if p_evento not in ('opened','clicked') then raise exception 'Evento no permitido'; end if;
  if not exists (
    select 1 from public.anuncios a
    where a.id=p_announcement_id
      and (a.estado_publicacion='publicado' or a.activa=true)
  ) then return false; end if;

  insert into public.anuncio_entregas(anuncio_id,user_id)
  values(p_announcement_id,auth.uid())
  on conflict(anuncio_id,user_id) do nothing;

  if p_evento='opened' then
    update public.anuncio_entregas
    set opened_at=coalesce(opened_at,now()),updated_at=now()
    where anuncio_id=p_announcement_id and user_id=auth.uid();
  else
    update public.anuncio_entregas
    set clicked_at=coalesce(clicked_at,now()),updated_at=now()
    where anuncio_id=p_announcement_id and user_id=auth.uid();
  end if;
  return true;
end;
$$;

revoke all on function public.registrar_anuncio_evento(uuid,text) from public;
grant execute on function public.registrar_anuncio_evento(uuid,text) to authenticated;
