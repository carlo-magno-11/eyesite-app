-- =============================================
-- MIGRACIÓN: Crear tabla notificaciones
-- Proyecto activo: xhvpvpvtkdgnnxdwdrkn
-- ESTADO: NO EJECUTADA. Copiar y ejecutar en Supabase SQL Editor.
-- =============================================

CREATE TABLE IF NOT EXISTS public.notificaciones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  titulo text not null,
  mensaje text not null,
  leida boolean default false,
  created_at timestamp with time zone default now()
);

-- Habilita RLS
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

-- Policy re-ejecutable (Postgres no soporta CREATE POLICY IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notificaciones'
      AND policyname = 'Users can see own notifications'
  ) THEN
    CREATE POLICY "Users can see own notifications" ON public.notificaciones
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Verificación
-- SELECT * FROM pg_tables WHERE schemaname='public' AND tablename='notificaciones';
-- SELECT * FROM pg_policies WHERE schemaname='public' AND tablename='notificaciones';