-- EYESITE security hardening: public property view is read-only.
-- The view remains security-definer so public clients can read approved
-- properties without direct access to public.propiedades.
-- All writes must go through authorized RPCs.

revoke insert, update, delete, truncate, references, trigger
on table public.propiedades_publicas
from anon, authenticated;

grant select
on table public.propiedades_publicas
to anon, authenticated;
