-- EYESITE — habilitar las escrituras del panel sobre anuncios con RLS administrativo
-- El panel usa INSERT/UPDATE directos en anuncios. RLS limita ambas operaciones
-- exclusivamente a private.is_admin(). No se concede acceso a anon.
grant insert, update on table public.anuncios to authenticated;
