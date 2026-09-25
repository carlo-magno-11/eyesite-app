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


## Verificaciones adicionales — continuación

- `saved_searches`: runtime confirmado con privilegios de cliente únicamente para `authenticated` (SELECT/INSERT/UPDATE/DELETE); no hay grants de `anon`.
- CRM: `track_property_event` y `registrar_prospecto_desde_interes` requieren sesión y perfil activo; ambos validan que la propiedad exista en `propiedades_publicas` y esté activa. Las operaciones administrativas `admin_list_prospectos` y `admin_update_prospecto` comprueban `is_admin()`.
- CRM: `property_events`, `prospectos`, `prospecto_propiedades` y `prospecto_actividades` no tienen grants directos a `anon`/`authenticated`; el acceso administrativo se mantiene detrás de RPC.
- CI GitHub Actions: la ejecución más reciente de `EYESITE checks` en `fix/eyesite-platform-security-20260925` terminó `success` en el commit `3e097f239979562b52a9b44af424765957d20924`, incluyendo TypeScript, lint, tests, Web export y la validación de configuración/privacy de iOS.
- Esto confirma la calidad automatizada del commit auditado; no sustituye la prueba física en dispositivos.

## Compatibilidad de plataforma revisada

- El mapa mantiene adaptadores separados para native (`components/leaflet-map.tsx`) y Web (`components/leaflet-map.web.tsx`).
- El mapa Web recalcula el tamaño de Leaflet al cambiar el tamaño del iframe/ventana.
- `expo-notifications` se carga dinámicamente y el listener de respuestas se evita en Web.
- La ubicación usa `expo-location` en iOS/Android y `navigator.geolocation` en Web.
- La subida de propiedades usa staging privado y namespaces por `user.id`.
- No se introduce Google Maps/Google Cloud en esta ruta.

## Riesgos/pendientes reales

1. La protección de contraseñas filtradas sigue pendiente en Supabase Auth. La documentación actual de Supabase indica que se configura desde **Authentication → Auth settings** y que esta función está disponible en Pro o superior.
2. `pg_net` sigue en `public` porque el scheduler depende de él; no se moverá sin verificar primero dependencias, permisos y ejecución del cron.
3. El Advisor seguirá mostrando las 4 tablas CRM sin políticas directas mientras permanezcan deliberadamente cerradas por grants y operadas por RPC.
4. Faltan pruebas físicas completas en iPhone/iPad/Android y navegadores Web con distintos tamaños; CI no puede validar interacción visual real, permisos de ubicación, WebView/iframe ni App Store behavior.
