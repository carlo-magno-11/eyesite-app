# EYESITE — Auditoría runtime Supabase 2026-09-25

## Proyecto verificado

Proyecto Supabase `terrenos Yucatan` (`xhvpvpvtkdgnnxdwdrkn`) está activo y saludable. PostgreSQL 17.6.1.

## Scheduler

El job `eyesite-process-communications` está activo cada minuto y llama a `process-scheduled-communications` mediante `pg_cron` + `pg_net`, enviando el secreto desde Vault.

La Edge Function desplegada tiene `verify_jwt=false`, coherente con este scheduler. La función exige además `x-eyesite-cron-secret` y compara el valor contra `get_eyesite_scheduler_secret()`.

`get_eyesite_scheduler_secret()` no es ejecutable por `anon`/ `authenticated`; su ACL runtime queda limitada a roles internos.

## Security Advisor

Hallazgos actuales:

- 4 tablas CRM tienen RLS sin políticas directas: `property_events`, `prospectos`, `prospecto_propiedades`, `prospecto_actividades`. Esto es deliberado en el diseño actual: no tienen grants directos para clientes y las operaciones se hacen mediante RPC SECURITY DEFINER con controles de autorización.
- `pg_net` permanece instalado en `public`. Se utiliza realmente por el cron del scheduler, por lo que no se mueve automáticamente sin una migración controlada del job.
- Advisor marca 26 funciones SECURITY DEFINER ejecutables por `authenticated`. La revisión de los cuerpos confirmó controles `is_admin()` en las funciones administrativas y controles de usuario activo/propietario en las funciones de usuario. Sus `search_path` están fijados.
- Supabase Auth reporta desactivada la protección contra contraseñas filtradas. Esto requiere activación desde la configuración de Auth del proyecto; no se debe simular mediante SQL.

## Notificaciones y anuncios

La entrega de anuncios ahora tiene un único ledger por `anuncio_id + user_id`. El envío inmediato desde el panel pasa `announcement_id` a `send-notification`, que crea/actualiza `anuncio_entregas`; el scheduler no vuelve a enviar filas ya marcadas como `sent`.

## Estado de catálogo verificado

En runtime:
- 10 propiedades activas.
- 10 propiedades visibles en `propiedades_publicas`.
- 3 propiedades activas con coordenadas.
- 1 anuncio actualmente publicado y vigente.

Por diseño, el mapa solo puede colocar marcadores de propiedades activas que tengan coordenadas válidas; por eso actualmente hay 3 propiedades aptas para marcador. No se deben inventar coordenadas para las otras 7.

## Pendientes antes de cierre

1. Activar leaked-password protection en Supabase Auth.
2. Decidir y ejecutar con control de cambios la migración de `pg_net` a un esquema no público, actualizando el cron si procede.
3. Ejecutar Security Advisor después de esas decisiones.
4. Ejecutar CI completo y pruebas físicas iOS/Android/Web.
5. Validar en navegador/Safari un anuncio inmediato y otro programado para confirmar el ledger en producción.
