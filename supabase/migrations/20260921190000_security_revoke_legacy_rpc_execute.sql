-- EYESITE — Hardening de funciones RPC no expuestas
-- Revoca funciones legacy/helpers que no deben ser llamadas desde el Data API.

revoke execute on function public.admin_aprobar_solicitud(uuid) from public;
revoke execute on function public.admin_aprobar_solicitud(uuid) from anon;
revoke execute on function public.admin_aprobar_solicitud(uuid) from authenticated;

revoke execute on function public.current_profile_role(uuid) from public;
revoke execute on function public.current_profile_role(uuid) from anon;
revoke execute on function public.current_profile_role(uuid) from authenticated;

revoke execute on function public.current_profile_estado(uuid) from public;
revoke execute on function public.current_profile_estado(uuid) from anon;
revoke execute on function public.current_profile_estado(uuid) from authenticated;
