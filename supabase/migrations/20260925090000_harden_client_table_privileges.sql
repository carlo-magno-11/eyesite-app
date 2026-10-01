-- EYESITE: remove client-side table privileges that are not needed by the app.
-- RLS is not a substitute for object privileges: TRUNCATE, TRIGGER and REFERENCES
-- should not be granted to the authenticated client role.
revoke truncate, references, trigger on table public.anuncios from authenticated;
revoke truncate, references, trigger on table public.anuncio_entregas from authenticated;
revoke truncate, references, trigger on table public.propiedades_mias from authenticated;
revoke truncate, references, trigger on table public.propiedades_publicas from authenticated;
