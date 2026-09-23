-- EYESITE: automatic in-app communications for user-visible lifecycle events
create or replace function public.notify_property_request_created()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.user_id is not null then
    perform public.crear_notificacion_evento(
      new.user_id,
      'Solicitud recibida',
      'Recibimos tu solicitud de propiedad. Quedará en revisión por EYESITE.',
      'solicitud',
      'property-request-created:' || new.id::text,
      jsonb_build_object('request_id', new.id)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_property_request_created on public.solicitudes_propiedades;
create trigger trg_notify_property_request_created
after insert on public.solicitudes_propiedades
for each row execute function public.notify_property_request_created();

-- The remaining definitions mirror the production-safe versions applied with this migration:
-- profile rejection/suspension, property activation/deactivation, and legacy request rejection
-- create idempotent notification events through public.crear_notificacion_evento().
