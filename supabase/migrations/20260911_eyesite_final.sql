-- ============================================================
-- EYESITE — MIGRACIÓN FINAL DE PRODUCCIÓN
-- Fecha: 2026-09-11
-- Proyecto: xhvpvpvtkdgnnxdwdrkn
--
-- EJECUCIÓN:
-- 1) Supabase Dashboard -> SQL Editor
-- 2) Pegar TODO este archivo
-- 3) Ejecutar una sola vez (es idempotente)
--
-- Objetivos:
-- - dejar un esquema único para la app móvil + admin HTML;
-- - separar solicitudes_propiedades de propiedades publicadas;
-- - estado canónico de propiedades publicadas: 'activa';
-- - estado de solicitudes: 'pendiente' | 'aprobada' | 'rechazada';
-- - blindar profiles para que un usuario NO pueda hacerse admin;
-- - permitir que cada usuario suba sus medios a eyesite-media;
-- - permitir que solo admins administren propiedades y revisen solicitudes;
-- - mantener lectura pública SOLO de propiedades activas y medios públicos;
-- - habilitar Realtime.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1) TABLAS BASE (solo se crean si no existen)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  role text NOT NULL DEFAULT 'user',
  nombre text,
  telefono text,
  estado text NOT NULL DEFAULT 'pendiente',
  terminos_aceptados boolean NOT NULL DEFAULT false,
  terminos_fecha timestamptz,
  full_name text,
  phone text,
  status text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.propiedades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text,
  tipo text,
  municipio text,
  precio_actual numeric,
  precio_mercado numeric,
  unidad_precio text DEFAULT 'm²',
  superficie numeric,
  unidad_superficie text DEFAULT 'm²',
  construccion_m2 numeric,
  rendimiento numeric DEFAULT 0,
  fotos jsonb NOT NULL DEFAULT '[]'::jsonb,
  videos jsonb NOT NULL DEFAULT '[]'::jsonb,
  video_url text,
  portada_url text,
  tipo_portada text NOT NULL DEFAULT 'foto',
  descripcion text,
  contacto_nombre text,
  contacto_telefono text,
  contacto_email text,
  activa boolean NOT NULL DEFAULT true,
  destacada boolean NOT NULL DEFAULT false,
  orden integer NOT NULL DEFAULT 0,
  codigo text,
  precio numeric,
  ubicacion text,
  imagenes jsonb NOT NULL DEFAULT '[]'::jsonb,
  archivos jsonb NOT NULL DEFAULT '[]'::jsonb,
  enlaces jsonb NOT NULL DEFAULT '[]'::jsonb,
  estado text NOT NULL DEFAULT 'activa',
  status text,
  usuario_id uuid,
  precio_esperado numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.solicitudes_propiedades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo text,
  tipo text,
  municipio text,
  precio_actual numeric,
  precio_mercado numeric,
  unidad_precio text DEFAULT 'm²',
  superficie numeric,
  unidad_superficie text DEFAULT 'm²',
  construccion_m2 numeric,
  rendimiento numeric DEFAULT 0,
  fotos jsonb NOT NULL DEFAULT '[]'::jsonb,
  imagenes jsonb NOT NULL DEFAULT '[]'::jsonb,
  videos jsonb NOT NULL DEFAULT '[]'::jsonb,
  video_url text,
  portada_url text,
  tipo_portada text NOT NULL DEFAULT 'foto',
  descripcion text,
  contacto_nombre text,
  contacto_telefono text,
  contacto_email text,
  precio numeric,
  ubicacion text,
  precio_esperado numeric,
  estado text NOT NULL DEFAULT 'pendiente',
  motivo_rechazo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Columnas necesarias si las tablas ya existían.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nombre text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telefono text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS estado text DEFAULT 'pendiente';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS terminos_aceptados boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS terminos_fecha timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

ALTER TABLE public.propiedades ADD COLUMN IF NOT EXISTS titulo text;
ALTER TABLE public.propiedades ADD COLUMN IF NOT EXISTS tipo text;
ALTER TABLE public.propiedades ADD COLUMN IF NOT EXISTS municipio text;
ALTER TABLE public.propiedades ADD COLUMN IF NOT EXISTS precio_actual numeric;
ALTER TABLE public.propiedades ADD COLUMN IF NOT EXISTS precio_mercado numeric;
ALTER TABLE public.propiedades ADD COLUMN IF NOT EXISTS unidad_precio text DEFAULT 'm²';
ALTER TABLE public.propiedades ADD COLUMN IF NOT EXISTS superficie numeric;
ALTER TABLE public.propiedades ADD COLUMN IF NOT EXISTS unidad_superficie text DEFAULT 'm²';
ALTER TABLE public.propiedades ADD COLUMN IF NOT EXISTS construccion_m2 numeric;
ALTER TABLE public.propiedades ADD COLUMN IF NOT EXISTS rendimiento numeric DEFAULT 0;
ALTER TABLE public.propiedades ADD COLUMN IF NOT EXISTS fotos jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.propiedades ADD COLUMN IF NOT EXISTS videos jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.propiedades ADD COLUMN IF NOT EXISTS video_url text;
ALTER TABLE public.propiedades ADD COLUMN IF NOT EXISTS portada_url text;
ALTER TABLE public.propiedades ADD COLUMN IF NOT EXISTS tipo_portada text DEFAULT 'foto';
ALTER TABLE public.propiedades ADD COLUMN IF NOT EXISTS descripcion text;
ALTER TABLE public.propiedades ADD COLUMN IF NOT EXISTS contacto_nombre text;
ALTER TABLE public.propiedades ADD COLUMN IF NOT EXISTS contacto_telefono text;
ALTER TABLE public.propiedades ADD COLUMN IF NOT EXISTS contacto_email text;
ALTER TABLE public.propiedades ADD COLUMN IF NOT EXISTS activa boolean DEFAULT true;
ALTER TABLE public.propiedades ADD COLUMN IF NOT EXISTS destacada boolean DEFAULT false;
ALTER TABLE public.propiedades ADD COLUMN IF NOT EXISTS orden integer DEFAULT 0;
ALTER TABLE public.propiedades ADD COLUMN IF NOT EXISTS codigo text;
ALTER TABLE public.propiedades ADD COLUMN IF NOT EXISTS precio numeric;
ALTER TABLE public.propiedades ADD COLUMN IF NOT EXISTS ubicacion text;
ALTER TABLE public.propiedades ADD COLUMN IF NOT EXISTS imagenes jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.propiedades ADD COLUMN IF NOT EXISTS archivos jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.propiedades ADD COLUMN IF NOT EXISTS enlaces jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.propiedades ADD COLUMN IF NOT EXISTS estado text DEFAULT 'activa';
ALTER TABLE public.propiedades ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.propiedades ADD COLUMN IF NOT EXISTS usuario_id uuid;
ALTER TABLE public.propiedades ADD COLUMN IF NOT EXISTS precio_esperado numeric;
ALTER TABLE public.propiedades ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.propiedades ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.solicitudes_propiedades ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.solicitudes_propiedades ADD COLUMN IF NOT EXISTS titulo text;
ALTER TABLE public.solicitudes_propiedades ADD COLUMN IF NOT EXISTS tipo text;
ALTER TABLE public.solicitudes_propiedades ADD COLUMN IF NOT EXISTS municipio text;
ALTER TABLE public.solicitudes_propiedades ADD COLUMN IF NOT EXISTS precio_actual numeric;
ALTER TABLE public.solicitudes_propiedades ADD COLUMN IF NOT EXISTS precio_mercado numeric;
ALTER TABLE public.solicitudes_propiedades ADD COLUMN IF NOT EXISTS unidad_precio text DEFAULT 'm²';
ALTER TABLE public.solicitudes_propiedades ADD COLUMN IF NOT EXISTS superficie numeric;
ALTER TABLE public.solicitudes_propiedades ADD COLUMN IF NOT EXISTS unidad_superficie text DEFAULT 'm²';
ALTER TABLE public.solicitudes_propiedades ADD COLUMN IF NOT EXISTS construccion_m2 numeric;
ALTER TABLE public.solicitudes_propiedades ADD COLUMN IF NOT EXISTS rendimiento numeric DEFAULT 0;
ALTER TABLE public.solicitudes_propiedades ADD COLUMN IF NOT EXISTS fotos jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.solicitudes_propiedades ADD COLUMN IF NOT EXISTS imagenes jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.solicitudes_propiedades ADD COLUMN IF NOT EXISTS videos jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.solicitudes_propiedades ADD COLUMN IF NOT EXISTS video_url text;
ALTER TABLE public.solicitudes_propiedades ADD COLUMN IF NOT EXISTS portada_url text;
ALTER TABLE public.solicitudes_propiedades ADD COLUMN IF NOT EXISTS tipo_portada text DEFAULT 'foto';
ALTER TABLE public.solicitudes_propiedades ADD COLUMN IF NOT EXISTS descripcion text;
ALTER TABLE public.solicitudes_propiedades ADD COLUMN IF NOT EXISTS contacto_nombre text;
ALTER TABLE public.solicitudes_propiedades ADD COLUMN IF NOT EXISTS contacto_telefono text;
ALTER TABLE public.solicitudes_propiedades ADD COLUMN IF NOT EXISTS contacto_email text;
ALTER TABLE public.solicitudes_propiedades ADD COLUMN IF NOT EXISTS precio numeric;
ALTER TABLE public.solicitudes_propiedades ADD COLUMN IF NOT EXISTS ubicacion text;
ALTER TABLE public.solicitudes_propiedades ADD COLUMN IF NOT EXISTS precio_esperado numeric;
ALTER TABLE public.solicitudes_propiedades ADD COLUMN IF NOT EXISTS estado text DEFAULT 'pendiente';
ALTER TABLE public.solicitudes_propiedades ADD COLUMN IF NOT EXISTS motivo_rechazo text;
ALTER TABLE public.solicitudes_propiedades ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.solicitudes_propiedades ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- ============================================================
-- 2) NORMALIZACIÓN DE DATOS EXISTENTES
-- ============================================================
UPDATE public.propiedades
SET precio_actual = COALESCE(precio_actual, precio)
WHERE precio_actual IS NULL AND precio IS NOT NULL;

UPDATE public.propiedades
SET municipio = COALESCE(municipio, ubicacion)
WHERE municipio IS NULL AND ubicacion IS NOT NULL;

UPDATE public.propiedades
SET fotos = COALESCE(NULLIF(fotos, '[]'::jsonb), imagenes, '[]'::jsonb)
WHERE fotos IS NULL OR fotos = '[]'::jsonb;

UPDATE public.propiedades
SET estado = 'activa'
WHERE estado IS NULL OR lower(trim(estado)) IN ('aprobado','aprobada','activo','active','publicado','publicada','activa - visible en app');

UPDATE public.propiedades
SET activa = true
WHERE estado = 'activa';

UPDATE public.profiles
SET role = 'user'
WHERE role IS NULL OR lower(trim(role)) IN ('cliente','usuario');

-- El administrador real queda con role=admin.
UPDATE public.profiles
SET role = 'admin', estado = COALESCE(NULLIF(estado, ''), 'activa'), status = COALESCE(NULLIF(status, ''), 'activa')
WHERE lower(email) = 'carlopiste@gmail.com';

-- ============================================================
-- 3) FUNCIONES SECURITY DEFINER PARA RLS
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.current_profile_role(uid uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = uid LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_profile_estado(uid uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT estado FROM public.profiles WHERE id = uid LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_profile_role(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_profile_estado(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_profile_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_profile_estado(uuid) TO authenticated;

-- ============================================================
-- 4) RLS PROFILES — SIN ESCALADA A ADMIN
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', r.policyname);
  END LOOP;
END $$;

CREATE POLICY profiles_select_own
ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid());

CREATE POLICY profiles_select_admin
ON public.profiles FOR SELECT TO authenticated
USING (public.is_admin());

-- Un usuario puede guardar sus datos, pero NO cambiar role ni estado.
CREATE POLICY profiles_insert_own
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (
  id = auth.uid()
  AND COALESCE(role, 'user') <> 'admin'
  AND COALESCE(estado, 'pendiente') = 'pendiente'
);

CREATE POLICY profiles_update_own
ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND COALESCE(role, 'user') = COALESCE(public.current_profile_role(auth.uid()), 'user')
  AND COALESCE(estado, 'pendiente') = COALESCE(public.current_profile_estado(auth.uid()), 'pendiente')
);

CREATE POLICY profiles_update_admin
ON public.profiles FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ============================================================
-- 5) RLS SOLICITUDES
-- ============================================================
ALTER TABLE public.solicitudes_propiedades ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'solicitudes_propiedades'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.solicitudes_propiedades', r.policyname);
  END LOOP;
END $$;

CREATE POLICY solicitudes_select_own
ON public.solicitudes_propiedades FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY solicitudes_insert_own
ON public.solicitudes_propiedades FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY solicitudes_update_own_or_admin
ON public.solicitudes_propiedades FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.is_admin())
WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY solicitudes_delete_admin
ON public.solicitudes_propiedades FOR DELETE TO authenticated
USING (public.is_admin());

-- ============================================================
-- 6) RLS PROPIEDADES
-- ============================================================
ALTER TABLE public.propiedades ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'propiedades'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.propiedades', r.policyname);
  END LOOP;
END $$;

CREATE POLICY propiedades_public_select
ON public.propiedades FOR SELECT
USING (estado = 'activa' AND COALESCE(activa, true) = true);

CREATE POLICY propiedades_admin_all
ON public.propiedades FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ============================================================
-- 7) STORAGE — eyesite-media ES EL BUCKET CANÓNICO
--    Usuarios autenticados pueden subir; solo dueño/admin modifica.
--    Lectura pública para imágenes/videos que ya fueron publicados.
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('eyesite-media', 'eyesite-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND (
        policyname ILIKE '%eyesite-media%'
        OR policyname = 'public read'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
  END LOOP;
END $$;

CREATE POLICY eyesite_media_public_read
ON storage.objects FOR SELECT
USING (bucket_id = 'eyesite-media');

CREATE POLICY eyesite_media_authenticated_insert
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'eyesite-media');

CREATE POLICY eyesite_media_owner_or_admin_update
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'eyesite-media' AND (owner_id = auth.uid() OR public.is_admin()))
WITH CHECK (bucket_id = 'eyesite-media' AND (owner_id = auth.uid() OR public.is_admin()));

CREATE POLICY eyesite_media_owner_or_admin_delete
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'eyesite-media' AND (owner_id = auth.uid() OR public.is_admin()));

-- ============================================================
-- 8) ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_estado ON public.profiles(estado);
CREATE INDEX IF NOT EXISTS idx_profiles_created ON public.profiles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_propiedades_estado ON public.propiedades(estado);
CREATE INDEX IF NOT EXISTS idx_propiedades_created ON public.propiedades(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_propiedades_orden ON public.propiedades(orden);
CREATE INDEX IF NOT EXISTS idx_solicitudes_estado ON public.solicitudes_propiedades(estado);
CREATE INDEX IF NOT EXISTS idx_solicitudes_user_id ON public.solicitudes_propiedades(user_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_created ON public.solicitudes_propiedades(created_at DESC);

-- ============================================================
-- 9) TRIGGER DE PERFIL NUEVO
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, estado, created_at, updated_at)
  VALUES (NEW.id, NEW.email, 'user', 'pendiente', now(), now())
  ON CONFLICT (id) DO UPDATE
  SET email = COALESCE(EXCLUDED.email, public.profiles.email),
      updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 10) REALTIME
-- ============================================================
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.propiedades;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.solicitudes_propiedades;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- ============================================================
-- 11) ACTUALIZAR CACHE POSTGREST
-- ============================================================
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- 12) COMPROBACIONES FINALES (se ejecutan y devuelven resultados)
-- ============================================================
SELECT 'profiles' AS tabla, count(*) AS filas FROM public.profiles
UNION ALL
SELECT 'propiedades', count(*) FROM public.propiedades
UNION ALL
SELECT 'solicitudes_propiedades', count(*) FROM public.solicitudes_propiedades;

SELECT id, email, role, estado
FROM public.profiles
WHERE lower(email) = 'carlopiste@gmail.com';

SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'propiedades', 'solicitudes_propiedades')
ORDER BY tablename, policyname;
