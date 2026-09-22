-- EYESITE: RLS helper privilege repair
-- private.is_active_user() is SECURITY DEFINER and is used by authenticated
-- RLS policies on notifications, favorites, profiles and property requests.
-- The caller still needs EXECUTE privilege even though the function is
-- SECURITY DEFINER. Keep it unavailable to anon.

GRANT EXECUTE ON FUNCTION private.is_active_user() TO authenticated;
REVOKE EXECUTE ON FUNCTION private.is_active_user() FROM anon;
