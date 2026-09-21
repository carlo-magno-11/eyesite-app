-- EYESITE — Security hardening
-- is_admin() is an internal SECURITY DEFINER helper used by protected
-- database functions/RLS. It is not an application RPC and must not be
-- directly callable by anon/authenticated clients.

revoke execute on function public.is_admin() from public;
revoke execute on function public.is_admin() from anon;
revoke execute on function public.is_admin() from authenticated;
