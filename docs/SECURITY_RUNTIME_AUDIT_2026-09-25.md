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


## Corrección de privilegios de cliente — nueva ronda

Se detectó y corrigió un riesgo real que RLS por sí solo no cubre: el rol `authenticated` tenía privilegios `TRUNCATE`, `TRIGGER` y `REFERENCES` sobre `anuncios`, `anuncio_entregas`, `propiedades_mias` y `propiedades_publicas`. Fueron revocados en runtime y se dejó la migración `20260925090000_harden_client_table_privileges.sql` para que la corrección persista en futuras instalaciones.

La verificación posterior devuelve cero grants de esos tres privilegios para `authenticated` en esas tablas.

## AuthGate — corrección funcional/de seguridad

Se encontró un caso de prioridad de estados: una cuenta `rechazado` o `suspendida` que todavía no tuviera los términos aceptados podía entrar temporalmente al flujo de términos antes de llegar a `denied`. Se corrigió `app/_layout.tsx` para que `rechazado/suspendida` tenga prioridad absoluta, `pendiente` permanezca en `pending`, y solo una cuenta `activa` pueda pasar al flujo de términos/catálogo.

## Storage legacy — riesgo identificado, cambio deliberadamente no destructivo

Producción todavía contiene buckets públicos legacy (`fotos`, `fotos-propiedades`, `kmz_kml`, `pdfs`, `propiedades`, `solicitudes`, `videos`, `documentos`). Existen políticas de lectura pública para varios de ellos. No se privatizaron ni eliminaron todavía porque primero hay que mapear cada URL/consumer y migrar los objetos que aún sean necesarios. Privatizarlos a ciegas podría romper propiedades históricas o documentos enlazados.

La ruta nueva de EYESITE ya separa `eyesite-media` público para media publicada, `eyesite-private` para documentos privados y `eyesite-staging` para cargas pendientes. El siguiente paso seguro es inventariar consumidores y objetos legacy y después retirar exposición bucket por bucket.

## Password security

Supabase documenta la protección contra contraseñas filtradas como una función de Auth/Attack Protection; actualmente no está disponible en el plan Free y sí aparece en planes de pago. No se simulará con SQL ni se añadirá lógica propia que pueda crear una falsa sensación de protección.


## SECURITY DEFINER / RPC boundary recheck

- No public `SECURITY DEFINER` function is executable by `anon`.
- The public `SECURITY DEFINER` functions audited all contain an explicit `search_path` configuration; no missing `search_path` case was found in the runtime query.
- This preserves the current model in which privileged database operations are reachable only through authenticated sessions and their internal authorization checks.


## Privilegios de catálogo público y entregas — 25/09/2026

Se volvió a auditar la separación entre permisos SQL y RLS. Se encontró que algunos roles de cliente conservaban privilegios de escritura/truncado/trigger/references aunque las políticas RLS impedían operaciones no autorizadas. Para reducir superficie de ataque se aplicó y versionó 20260925093000_harden_public_catalog_and_delivery_grants.sql.

Resultado runtime:
- propiedades_publicas: anon y authenticated conservan únicamente SELECT.
- anuncios: anon y authenticated conservan únicamente SELECT; las mutaciones administrativas siguen el flujo protegido de administración/RPC.
- anuncio_entregas: authenticated conserva únicamente SELECT; anon no tiene privilegios de tabla. Las escrituras del ledger quedan en workflows confiables de servidor.

El Security Advisor sigue mostrando las cuatro tablas CRM con RLS sin políticas directas, pg_net en public, 26 funciones SECURITY DEFINER ejecutables por authenticated y protección de contraseñas filtradas desactivada. Estos avisos restantes requieren decisiones separadas porque cambiar cualquiera de ellos a ciegas puede romper el CRM, el scheduler o el flujo de Auth.

La ejecución de CI asociada al nuevo commit aún no aparece en el conector de GitHub; por ello no se marca como aprobada hasta que exista un run verificable.
