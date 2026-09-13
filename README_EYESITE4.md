# EYESITE 4

EYESITE 4 parte del ZIP de EYESITE 3 y endurece la frontera entre app pública y administración.

## Supabase

Producción actualizada con:
- `eyesite4_hardening_v2`
- `eyesite4_realtime_audit`
- `eyesite4_public_minimal`

La tabla `propiedades` ya no tiene SELECT para `anon` ni `authenticated`. La app pública usa `propiedades_publicas` y el panel administrativo usa `propiedades_admin`.

La aprobación/rechazo de solicitudes se hace mediante RPCs servidor:
- `admin_approve_property_request`
- `admin_reject_property_request`

La aprobación es atómica y copia todos los campos enriquecidos sin depender del payload del frontend.

## Seguridad
- MFA/AAL2 permanece obligatorio en el panel HTML.
- El panel HTML comprueba además `profiles.role='admin'` y `profiles.estado='activa'`.
- Las acciones administrativas quedan auditadas en `admin_activity_log`.
- Las bajas de precio generan notificaciones para usuarios que tienen la propiedad en favoritos y para el propietario cuando corresponde.
- `propiedades.fotos` continúa siendo `text[]`.

## Estructura añadida
- `lib/admin-service.ts`
- `app/admin/auditoria.tsx`
- `app/admin/propiedad/[id].tsx`
- `__tests__/eyesite4-security.test.ts`

## EYESITE 4 — hardening adicional

- Las fotos y videos de solicitudes nuevas se cargan en `eyesite-staging`, bucket privado de hasta 100 MB.
- Cada usuario solo puede escribir/leer su propia carpeta; el administrador puede revisar los medios.
- Al aprobar, el panel administrativo descarga los medios del staging y los publica en `eyesite-media`; la propiedad recibe únicamente URLs públicas ya publicables.
- Al aprobar o rechazar, el panel intenta eliminar los medios temporales del staging.
- `eyesite-private` queda reservado para documentos administrativos y permanece privado, con límite de 25 MB.
- Los buckets históricos mantienen lectura pública de contenido existente para evitar romper URLs antiguas, pero sus escrituras quedan restringidas a administradores.
- Las RPC administrativas de aprobación/rechazo no tienen `EXECUTE` para `anon`.
- El listado de solicitudes ya no permite aprobar directamente sin revisión: abre el detalle administrativo, donde se revisan los medios antes de publicar.

## Mapa de propiedades — EYESITE 4

EYESITE 4 now includes an optional geographic layer for published properties:
- `propiedades.latitud` / `propiedades.longitud`
- `solicitudes_propiedades.latitud` / `solicitudes_propiedades.longitud`
- public projection exposes only these two coordinates in `propiedades_publicas`
- the mobile Map tab requests foreground location only when needed
- properties without verified coordinates are intentionally excluded from the nearby map
- publishing can save the device's current location as the property's map point when the publisher is physically at the property

This prevents EYESITE from inventing coordinates for legacy properties. Existing properties must be assigned verified coordinates before they appear as map markers.
