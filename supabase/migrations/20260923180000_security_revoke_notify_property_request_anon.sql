-- EYESITE security hardening
-- The trigger function is SECURITY DEFINER and is invoked by PostgreSQL
-- through trg_notify_property_request_created. It must not be callable
-- through the public REST RPC surface by anonymous users.
revoke execute on function public.notify_property_request_created() from anon;
