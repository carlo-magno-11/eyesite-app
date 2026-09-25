-- EYESITE — Harden internal property-request notification trigger
-- 2026-09-25
--
-- This trigger function is invoked by PostgreSQL; authenticated clients do not
-- need RPC EXECUTE access to it. Keep trigger execution intact while removing
-- direct API/RPC invocation by public and authenticated roles.

revoke execute
on function public.notify_property_request_created()
from public, anon, authenticated;
