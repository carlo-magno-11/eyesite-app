# EYESITE — Auditoría runtime Supabase 2026-09-25

## Estado verificado

- Proyecto: `terrenos Yucatan`.
- PostgreSQL: 17.6.1.
- Scheduler de comunicaciones: activo cada minuto.
- `send-notification`: versión 7 desplegada con JWT obligatorio.
- `process-scheduled-communications`: JWT desactivado únicamente por ser función de cron; valida su secreto propio.
- Catálogo: 10 propiedades activas, 10 en `propiedades_publicas`, 3 con coordenadas válidas y 1 anuncio publicado/vigente.

## Corrección aplicada durante la auditoría

`saved_searches` tenía grants de tabla heredados para `anon`, aunque sus políticas RLS solo permitían usuarios autenticados activos. Se revocaron todos los grants de `anon` y se restauraron únicamente SELECT/INSERT/UPDATE/DELETE para `authenticated`. La migración CRM también quedó corregida para conservar esta frontera en futuras instalaciones.

## Security Advisor

Los avisos que permanecen son:

- 4 tablas CRM con RLS sin políticas directas. Se mantienen sin grants de cliente y sus operaciones pasan por RPC controladas.
- `pg_net` en `public`, porque el scheduler lo utiliza actualmente.
- 26 funciones `SECURITY DEFINER` ejecutables por `authenticated`. Son RPC intencionales; la auditoría de sus cuerpos confirmó controles administrativos o de usuario/propiedad según la función.
- Protección contra contraseñas filtradas desactivada en Supabase Auth. Esto requiere activarse desde la configuración de Auth, no mediante SQL.

## Decisiones pendientes

1. Activar leaked-password protection en Auth.
2. Evaluar migración controlada de `pg_net` fuera de `public`, sin romper el scheduler.
3. Ejecutar Advisor nuevamente después de esos cambios.
4. Ejecutar CI completo.
5. Hacer pruebas físicas de iOS, Android y Web.
