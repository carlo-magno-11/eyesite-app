# EYESITE Comercial — Fase 1 CRM / Matching

Fecha: 2026-09-25
Rama: `feature/eyesite-commercial-crm`
Base: `fix/web-map-layout-final`

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

La migración fue aplicada al proyecto Supabase de producción después de validación transaccional.

### App
- `lib/commercial.ts`: scoring y matching deterministas.
- `hooks/use-commercial.ts`: tracking, prospectos y búsquedas guardadas.
- Detalle de propiedad registra vista, compartir y contacto por WhatsApp.
- Contacto por WhatsApp registra/actualiza prospecto.
- Favoritos alimentan la telemetría.
- Oportunidades permite guardar una búsqueda.
- Nueva pantalla `/saved-searches`.
- Mi cuenta incluye acceso a Mis búsquedas.
- Inicio muestra hasta tres coincidencias personalizadas según presupuesto/zona cuando existen datos suficientes.

### Admin
- Nuevo módulo `public/crm.js`.
- Nueva sección “Prospectos CRM”.
- El administrador puede revisar prospectos, score, fuente, propiedades relacionadas, actividad y cambiar el estado comercial.

## Seguridad

- Las tablas CRM sensibles no tienen acceso directo de `anon`/ `authenticated`.
- Las operaciones comerciales de la app usan RPC autenticado.
- El panel usa RPC administrativos protegidos por `is_admin()`.
- Las búsquedas guardadas usan RLS por propietario y requieren perfil activo.
- No se modifica la frontera pública de `propiedades_publicas`.
- No se toca `main`.

## Validaciones realizadas

1. La migración completa se ejecutó dentro de una transacción de prueba y se hizo rollback.
2. Se validó creación de tablas, funciones y políticas.
3. Se probó en transacción el registro de un evento y la creación de un prospecto usando un usuario activo real; se hizo rollback.
4. Se probó en transacción el listado y actualización administrativa de un prospecto; se hizo rollback.
5. La migración fue aplicada a producción después de esas validaciones.
6. Se probó la automatización de coincidencias de búsquedas guardadas dentro de una transacción: se generó una notificación de prueba y se hizo rollback.
7. Se corrigió el trigger preexistente de `propiedades_cambios` y se verificó que una actualización de propiedad genera un registro `update` correctamente.
8. Se verificó la presencia de las cinco tablas nuevas.
9. Security Advisor no reportó un problema nuevo distinto de los avisos esperables por tablas CRM sin acceso directo y funciones SECURITY DEFINER protegidas por `is_admin()`; permanecen los avisos previos de `pg_net` en public y leaked-password protection.

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

## Regla de promoción

Esta rama no se debe fusionar a `main` hasta que el código y la migración estén revisados y las pruebas físicas en iOS, Android y Web sean satisfactorias.
