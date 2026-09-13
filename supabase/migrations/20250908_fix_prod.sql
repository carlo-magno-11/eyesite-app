-- ============================================================
-- MIGRACIÓN PROD 20250908 — RLS por roles (admin) + buckets storage
-- Proyecto: xhvpvpvtkdgnnxdwdrkn (eyesite-app)
-- ESTADO: NO EJECUTADA — pegar y ejecutar completo en Supabase SQL Editor.
-- Idempotente: re-ejecutable sin error.
--
-- POR QUÉ: la app reemplazó el password hardcodeado ('terrenos2024')
-- por un gate de role (profiles.role = 'admin'). Esta migración hace
-- que ese gate sea REAL a nivel de base de datos:
--   - un usuario NO-admin ya no puede leer emails/teléfonos de otros (RLS);
--   - solo admins listan/editan solicitudes_propiedades en estado Pendiente;
--   - solo admins insertan/editan/borran en propiedades.
--
-- CORRIGE además: la policy 'admin_all' de 20250998_admin_realtime_fix.sql
-- consultaba profiles DENTRO de una policy de profiles (misma tabla), lo que
-- Postgres rechaza con 'infinite recursion detected in policy for relation
-- profiles'. Aquí se usa public.is_admin() con SECURITY DEFINER (corre como
-- dueño de la tabla, sin RLS encima => sin recursión).
-- ============================================================

-- ============================================================
-- 1) Helper is_admin() — SECURITY DEFINER (evita recursión de RLS)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  );
$$;

-- ============================================================
-- 2) RLS profiles — el dueño y el admin
--    (create-profile.tsx UPDATE/INSERT propio; useAuth SELECT propio;
--     app/admin/users.tsx SELECT/UPDATE de todo solo como admin)
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Quita TODAS las policies previas de profiles (unificamos acceso por rol).
-- La app nunca expone profiles a anon: el login va por supabase.auth.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.profiles', r.policyname);
  END LOOP;
END $$;

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_select_admin" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- ============================================================
-- 3) RLS solicitudes_propiedades — dueño (publica) y admin (revisa)
--    publish.tsx: INSERT/UPDATE con user_id = auth.uid()
--    admin/solicitudes.tsx: SELECT de Pendientes + UPDATE de estado
-- ============================================================
ALTER TABLE public.solicitudes_propiedades ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'solicitudes_propiedades'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.solicitudes_propiedades', r.policyname);
  END LOOP;
END $$;

CREATE POLICY "solicitudes_select_own" ON public.solicitudes_propiedades
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "solicitudes_select_admin" ON public.solicitudes_propiedades
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "solicitudes_insert_own" ON public.solicitudes_propiedades
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "solicitudes_update_own_or_admin" ON public.solicitudes_propiedades
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "solicitudes_delete_admin" ON public.solicitudes_propiedades
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- ============================================================
-- 4) RLS propiedades — anon lee activas; solo admin gestiona
-- ============================================================
ALTER TABLE public.propiedades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read activa" ON public.propiedades;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.propiedades;
DROP POLICY IF EXISTS "anon read propiedades" ON public.propiedades;
DROP POLICY IF EXISTS "propiedades_admin_all" ON public.propiedades;

CREATE POLICY "public read activa" ON public.propiedades
  FOR SELECT
  USING (estado = 'activa');

CREATE POLICY "propiedades_admin_all" ON public.propiedades
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- 5) Storage: buckets públicos + policies de objetos
--    (montado del rls_storage.sql + 20250516_fix_storage_public.sql reales)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('fotos', 'fotos', true),
  ('videos', 'videos', true),
  ('pdfs', 'pdfs', true),
  ('kmz_kml', 'kmz_kml', true),
  ('eyesite-media', 'eyesite-media', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Policy legacy 'public read' (20250516) para eyesite-media
DROP POLICY IF EXISTS "public read" ON storage.objects;
CREATE POLICY "public read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'eyesite-media');

-- Mismas names que rls_storage.sql => idempotente:
-- SELECT público (anon) + INSERT/UPDATE/DELETE solo authenticated
DO $$
DECLARE b text;
BEGIN
  FOREACH b IN ARRAY ARRAY['fotos','videos','pdfs','kmz_kml','eyesite-media'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', b || ' public read');
    EXECUTE format('CREATE POLICY %I ON storage.objects FOR SELECT USING (bucket_id = %L)', b || ' public read', b);

    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', b || ' authenticated insert');
    EXECUTE format('CREATE POLICY %I ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = %L)', b || ' authenticated insert', b);

    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', b || ' authenticated update');
    EXECUTE format('CREATE POLICY %I ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = %L)', b || ' authenticated update', b);

    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', b || ' authenticated delete');
    EXECUTE format('CREATE POLICY %I ON storage.objects FOR DELETE TO authenticated USING (bucket_id = %L)', b || ' authenticated delete', b);
  END LOOP;
END $$;

-- ============================================================
-- 6) Realtime para las tablas del panel (idempotente)
--    (montado de 20250998_admin_realtime_fix.sql)
-- ============================================================
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
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='solicitudes_propiedades') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.solicitudes_propiedades;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- ============================================================
-- 7) Trigger: crear profile automáticamente al registrarse
--    (montado de 20250998_admin_realtime_fix.sql)
-- ============================================================
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

-- ============================================================
-- 8) Recargar caché de PostgREST
-- ============================================================
NOTIFY pgrst, 'reload schema';

-- Verificación (descomentar en SQL Editor):
-- SELECT id, email, role, estado FROM public.profiles ORDER BY created_at;
-- SELECT policyname, cmd FROM pg_policies WHERE schemaname='public' AND tablename='profiles' ORDER BY 1;
-- SELECT tablename, policyname, cmd, roles FROM pg_policies WHERE schemaname='public' AND tablename='solicitudes_propiedades' ORDER BY 1;