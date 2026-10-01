# EYESITE Comercial — Fase 1 CRM / Matching

Fecha: 2026-09-25
Rama: `feature/eyesite-commercial-crm`
Base: `fix/web-map-layout-final`
PR: #25 (draft, NO MERGE)

## Alcance aprobado

Se excluyen explícitamente de esta fase:
- Agenda de visitas.
- Calidad de publicación.

Se construye únicamente la base comercial prioritaria:
1. Telemetría de interacción con propiedades.
2. Búsquedas guardadas.
3. Prospectos CRM.
4. Relación prospecto ↔ propiedad.
5. Actividades comerciales.
6. Lead score explicable.
7. Matching comprador ↔ propiedad.
8. Panel administrativo de prospectos.
9. Alertas automáticas por coincidencia.
10. Tracking de apertura de propiedades desde el mapa.

## Cambios realizados

### Supabase
- Se añadió automatización de alertas de coincidencia: una propiedad activa que coincide con una búsqueda guardada genera una notificación idempotente dentro de EYESITE.
- Durante la validación de esta fase se detectó y corrigió un bug preexistente en `emit_propiedad_cambio()`: la función usaba nombres de columnas/valores antiguos de `propiedades_cambios`. Se corrigió sin modificar datos existentes y se volvió a probar dentro de transacción.
- Migración `20260925060751_commercial_crm_foundation.sql` aplicada al proyecto Supabase de producción después de validación transaccional.
- Es un cambio aditivo: no modifica ni elimina datos existentes.
- `property_events`
- `saved_searches`
- `prospectos`
- `prospecto_propiedades`
- `prospecto_actividades`
- RLS y grants mínimos.
- RPC `track_property_event`.
- RPC `registrar_prospecto_desde_interes`.
- RPC `admin_list_prospectos`.
- RPC `admin_update_prospecto`.
- Índice `prospecto_actividades_property_idx(property_id, created_at DESC)` para cubrir la FK de actividad hacia propiedades; quedó aplicado en producción.
- El endurecimiento `revoke_trigger_notification_execute` también está aplicado en producción; el versionado remoto asignado por Supabase es `20260925070503`. El archivo del repositorio conserva el nombre lógico `20260925070000_revoke_trigger_notification_execute.sql`.
- Se revocó EXECUTE directo sobre `notify_property_request_created()` para `public`, `anon` y `authenticated`. La función continúa disponible para el trigger que la necesita.

La migración comercial y los cambios de seguridad fueron aplicados mediante el flujo de migraciones de Supabase.

### App
- `lib/commercial.ts`: scoring y matching deterministas.
- `hooks/use-commercial.ts`: tracking, prospectos y búsquedas guardadas.
- Detalle de propiedad registra vista, compartir y contacto por WhatsApp.
- Apertura de propiedad desde el mapa registra `map_open` de forma no bloqueante antes de navegar.
- Contacto por WhatsApp registra/actualiza prospecto.
- Favoritos alimentan la telemetría sin bloquear la acción principal.
- Oportunidades permite guardar una búsqueda con tipo, zona/municipio, rango de precio y rango de superficie activos en pantalla.
- Mis búsquedas muestra los criterios comerciales guardados; el texto libre de título/ubicación no se trata como criterio de matching porque el esquema comercial no lo define como campo.
- Nueva pantalla `/saved-searches`.
- Mi cuenta incluye acceso a Mis búsquedas.
- Inicio muestra hasta tres coincidencias personalizadas según presupuesto/zona cuando existen datos suficientes.
- El listener nativo de notificaciones configura presentación de push en primer plano para iOS/Android; la bandeja in-app sigue funcionando mediante Supabase Realtime.

### Admin
- Nuevo módulo `public/crm.js`.
- Nueva sección “Prospectos CRM”.
- El administrador puede revisar prospectos, score, fuente, propiedades relacionadas, actividad y cambiar el estado comercial.

## Seguridad

- Las tablas CRM sensibles no tienen acceso directo de `anon`/`authenticated`.
- Las operaciones comerciales de la app usan RPC autenticado.
- El panel usa RPC administrativos protegidos por `is_admin()`.
- Las búsquedas guardadas usan RLS por propietario y requieren perfil activo.
- Las funciones SECURITY DEFINER auditadas usan `search_path` fijado; las funciones administrativas comprobadas validan `auth.uid()`/administración antes de modificar datos.
- `is_admin()` es SECURITY DEFINER con `search_path=public` y comprueba el rol del perfil asociado a `auth.uid()`.
- No se modifica la frontera pública de `propiedades_publicas`.
- No se toca `main`.

### Estado del Security Advisor al 2026-09-25

Permanecen tres grupos de avisos conocidos:
1. CRM con RLS habilitado y sin políticas directas: `property_events`, `prospectos`, `prospecto_propiedades`, `prospecto_actividades`. Es deliberado: el acceso de aplicación se hace por RPC y no por SELECT/UPDATE directo.
2. `pg_net` instalado en `public`: WARN. No se mueve todavía porque puede afectar integraciones existentes y requiere una migración específica de dependencias.
3. Funciones SECURITY DEFINER ejecutables por `authenticated`: WARN. Las funciones administrativas están diseñadas para ser invocables por clientes autenticados, pero internamente exigen `is_admin()`; las funciones de usuario comprueban identidad/perfil activo y limitan la operación a los datos permitidos. Se revocó específicamente el EXECUTE directo de `notify_property_request_created()` porque no necesita ser invocada por usuarios.
4. Protección de contraseñas filtradas de Supabase Auth: WARN. Sigue pendiente activarla desde Auth porque es una configuración de servicio, no un cambio de código.

No se elimina ni revoca de forma masiva ninguna función SECURITY DEFINER sin comprobar primero todos sus consumidores.

## Storage auditado

- `eyesite-media`: público, actualmente con objetos.
- `eyesite-private`: privado.
- `eyesite-staging`: privado.
- Existen buckets públicos heredados con objetos históricos, incluido `fotos-propiedades`. No se han hecho privados ni eliminado porque todavía no está demostrado que ningún consumidor histórico dependa de ellos.
- `get-property-document` mantiene la frontera privada mediante URL firmada y validación de propiedad/ruta.
- `promote-submission-media` mantiene autenticación manual, validación de administrador, control de rutas, MIME/tamaño y destinos deterministas.
- Pendiente antes de limpiar buckets heredados: mapear cada consumidor app/admin/Edge Function/DB y comprobar que no quedan referencias activas.

## Validaciones realizadas

1. La migración completa se ejecutó dentro de una transacción de prueba y se hizo rollback.
2. Se validó creación de tablas, funciones y políticas.
3. Se probó en transacción el registro de un evento y la creación de un prospecto usando un usuario activo real; se hizo rollback.
4. Se probó en transacción el listado y actualización administrativa de un prospecto; se hizo rollback.
5. La migración fue aplicada a producción después de esas validaciones.
6. Se probó la automatización de coincidencias de búsquedas guardadas dentro de una transacción: se generó una notificación de prueba y se hizo rollback.
7. Se corrigió el trigger preexistente de `propiedades_cambios` y se verificó que una actualización de propiedad genera un registro `update` correctamente.
8. Se verificó la presencia de las cinco tablas nuevas.
9. Se aplicó el índice de la FK `prospecto_actividades.property_id`; Performance Advisor ya no reporta esa FK como no indexada.
10. Se añadió presentación de push en primer plano y se mantiene pendiente la prueba física de entrega real.
11. Se añadió tracking de apertura desde mapa; la telemetría es no bloqueante.
12. Se aplicó el endurecimiento de EXECUTE sobre `notify_property_request_created()`.
13. Security Advisor quedó en los avisos documentados arriba; no apareció un bypass de autenticación nuevo en esta revisión.
14. GitHub Actions del HEAD actual `c8af36a6f4eb72bdac92e2bef59b443d8813efb0`: `EYESITE checks` run #335, conclusión `success`.
15. PR #25 continúa abierto y en estado draft; su base es `main` en `e9dc35352d1e392895d197c1d0562e452cf467dd`. No está fusionado.

## Hallazgos que requieren revisión posterior

- Hay dos rutas administrativas históricas de aprobación de solicitudes (`admin_approve_property_request` y `admin_aprobar_solicitud`). Ambas verifican `is_admin()`, pero conviene unificar el flujo para evitar divergencia de comportamiento y notificaciones antes de una fase de producción final.
- `admin_update_property()` usa SQL dinámico, pero la clave recibida se comprueba contra una lista blanca antes de interpolarla como identificador. No se ha encontrado una inyección derivada de esa parte; aun así, queda como punto de revisión de mantenimiento.
- El payload de `send-notification` todavía necesita límites estrictos de tamaño/tipos en la Edge Function. Se intentó endurecerlo desde GitHub, pero la escritura fue bloqueada por controles de seguridad de la herramienta; por lo tanto, NO se declara aplicado.
- Los buckets heredados requieren un inventario de consumidores antes de cualquier limpieza.

## Pruebas todavía pendientes

No se declara compatibilidad física hasta ejecutar:
- TypeScript/check.
- Lint.
- Tests.
- Build web.
- Expo Doctor.
- Web Safari/Chrome.
- iPhone físico.
- Android físico.
- Persistencia de sesión.
- Guardado/eliminación de búsquedas.
- Tracking real.
- Creación real de prospecto.
- CRM admin real.
- Realtime/notificaciones derivadas.
- Push real en foreground/background.
- Flujo completo: búsqueda guardada → publicación de propiedad compatible → notificación → apertura desde notificación/mapa.

## Regla de promoción

Esta rama no se debe fusionar a `main` hasta que el código y las migraciones estén revisados y las pruebas físicas en iOS, Android y Web sean satisfactorias.
