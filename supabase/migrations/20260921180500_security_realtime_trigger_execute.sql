-- EYESITE: the property-change trigger is internal only.
-- It must never be callable through PostgREST by anon/authenticated users.
revoke execute on function public.notify_propiedad_change() from public;
revoke execute on function public.notify_propiedad_change() from anon;
revoke execute on function public.notify_propiedad_change() from authenticated;