-- ============================================================
-- MIGRACIÓN: Admin Panel Realtime + Fix usuarios no visibles
-- Proyecto activo: xhvpvpvtkdgnnxdwdrkn
-- ESTADO: NO EJECUTADA. Pegar y ejecutar completo en Supabase
--   Dashboard > SQL Editor (idempotente, re-ejecutable sin error).
-- Nota: requerirá privilegios de admin del proyecto (el SQL Editor
--   los tiene; la app usa solo anonymous key aposta).
-- ============================================================

-- ── 1. Activa Realtime (solo si la tabla existe) ──
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='profiles') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='propiedades') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.propiedades;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='properties') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.properties;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='solicitudes_propiedades') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.solicitudes_propiedades;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- ── 2. RLS fix para admin (crea policy solo si no existe) ──
DROP POLICY IF EXISTS "admin_all" ON public.profiles;
CREATE POLICY "admin_all" ON public.profiles FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- ── 3. Trigger para crear profile al registrar en auth.users ──
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, estado, created_at)
  VALUES (NEW.id, NEW.email, 'user', 'pendiente', NOW())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Recargar caché de PostgREST
NOTIFY pgrst, 'reload schema';

-- Verificación (descomentar en SQL Editor):
-- SELECT p.relname AS tabla FROM pg_publication_tables p WHERE p.pubname='supabase_realtime' ORDER BY 1;
-- SELECT id, email, role, estado FROM public.profiles ORDER BY created_at;