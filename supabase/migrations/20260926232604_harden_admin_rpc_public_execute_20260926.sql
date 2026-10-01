-- EYESITE: close implicit PUBLIC EXECUTE on administrative SECURITY DEFINER RPCs.
-- Applied to production as migration version 20260926232604.
-- The admin panel uses authenticated callers; functions keep their existing
-- is_admin() authorization checks. This migration only removes implicit PUBLIC
-- execution and preserves existing authenticated grants.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid,
           n.nspname,
           p.proname,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND p.proname LIKE 'admin_%'
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC',
      r.nspname, r.proname, r.args
    );
  END LOOP;
END
$$;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid,
           n.nspname,
           p.proname,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND p.proname LIKE 'admin_%'
      AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
  LOOP
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated',
      r.nspname, r.proname, r.args
    );
  END LOOP;
END
$$;
