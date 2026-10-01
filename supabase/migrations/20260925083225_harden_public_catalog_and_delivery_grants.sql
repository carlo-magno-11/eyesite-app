-- EYESITE: least-privilege grants for public catalog and announcement delivery ledger
-- Client roles are read-only for public catalog/announcements and cannot mutate delivery state.

revoke all on table public.anuncio_entregas from anon;
revoke insert, update, delete, truncate, references, trigger on table public.anuncio_entregas from authenticated;
grant select on table public.anuncio_entregas to authenticated;

revoke insert, update, delete, truncate, references, trigger on table public.propiedades_publicas from anon, authenticated;
grant select on table public.propiedades_publicas to anon, authenticated;

revoke insert, update, delete, truncate, references, trigger on table public.anuncios from anon, authenticated;
grant select on table public.anuncios to anon, authenticated;

comment on table public.anuncio_entregas is 'Delivery ledger; client roles are read-only. Writes are performed by trusted server-side notification workflows.';
comment on table public.propiedades_publicas is 'Public read-only catalog projection; source mutations occur through protected admin workflows.';
