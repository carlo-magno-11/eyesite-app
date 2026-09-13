-- EYESITE 4 — integridad de favoritos
-- Ya aplicado en producción; se conserva aquí para reproducibilidad.
alter table public.favoritos
  alter column user_id set not null,
  alter column property_id set not null;

create unique index if not exists favoritos_user_property_unique
  on public.favoritos(user_id, property_id);

alter table public.favoritos
  drop constraint if exists favoritos_user_id_fkey,
  drop constraint if exists favoritos_property_id_fkey;

alter table public.favoritos
  add constraint favoritos_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade,
  add constraint favoritos_property_id_fkey
    foreign key (property_id) references public.propiedades(id) on delete cascade;

notify pgrst, 'reload schema';
