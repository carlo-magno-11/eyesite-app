# EYESITE — Auditoría intensiva y reparaciones 2026-09-25

## Rama de trabajo

- Base auditada: `feature/eyesite-commercial-crm`.
- Rama de reparación: `fix/eyesite-platform-security-20260925`.
- `main` permanece sin modificaciones.

## Correcciones verificadas

### 1. Realtime de detalle de propiedad

`hooks/use-properties.ts` usa la vista pública `propiedades_publicas` y el feed `propiedades_cambios` con `property_id=eq.<id>`. La limpieza del canal usa la generación de canal para evitar listeners obsoletos.

### 2. Mapa Web responsive

`app/(tabs)/map.tsx` usa una altura Web calculada con el viewport: mínimo 420px, máximo 680px y 62% de la altura disponible. Esto evita que el mapa domine pantallas de escritorio y mantiene una superficie útil en tablets.

No se introduce Google Maps ni Google Cloud.

### 3. Compatibilidad Web del mapa

`components/leaflet-map.web.tsx` separa Web mediante iframe + `postMessage`; iOS/Android conservan `react-native-webview`. Ambos usan Leaflet/OpenStreetMap.

### 4. `send-notification` — validación de entrada

Se validan JWT/sesión administrativa, límites de payload, UUID, destinatarios, tamaños de texto, `data` JSON y máximo de 500 destinatarios.

### 5. Anuncios — idempotencia de entrega push

Se corrigió el hueco entre anuncios inmediatos y el scheduler:

- Los anuncios inmediatos del panel ahora envían `announcement_id` a `send-notification`.
- `send-notification` verifica que el anuncio exista, esté publicado y activo.
- Antes del push se crea/asegura una fila por `anuncio_id + user_id` en `anuncio_entregas`.
- Cada ticket de Expo actualiza esa fila a `sent`, `error` o `not_configured`.
- El scheduler procesa únicamente entregas pendientes/error, por lo que una entrega inmediata marcada como `sent` no vuelve a enviarse.
- La restricción única `unique(anuncio_id,user_id)` sigue siendo la barrera de duplicación por destinatario.

Archivos modificados:
- `public/admin.js`
- `supabase/functions/send-notification/index.ts`

### 6. Límite JWT del scheduler — documentado en código

Se añadió `supabase/config.toml` con:

`[functions.process-scheduled-communications]`
`verify_jwt = false`

La función no queda abierta: exige el encabezado secreto propio `x-eyesite-cron-secret` y lo compara mediante `get_eyesite_scheduler_secret`. Esto hace explícita la frontera para invocación por cron/scheduler.

## Seguridad todavía pendiente de validación

1. Revisar cuerpos de todas las funciones `SECURITY DEFINER`, especialmente autorización y `search_path`.
2. Mapear consumidores de buckets públicos históricos antes de cambiar privacidad/eliminación.
3. Verificar en el proyecto Supabase la protección contra contraseñas filtradas.
4. Revisar configuración/uso de `pg_net`.
5. Confirmar en Supabase que el scheduler usa el secreto correcto y que la función no se invoca desde clientes.
6. Ejecutar Security Advisor después de las correcciones.
7. Probar flujo completo de medios: envío → edición → promoción → aprobación → vista pública → mapa.
8. Probar anuncios/notificaciones en iOS, Android y Web, incluyendo inmediatos, programados, preferencias, tokens inválidos y reintentos.

## Security Advisor runtime

El proyecto Supabase fue revisado en runtime. Los avisos actuales son: 4 tablas CRM con RLS sin políticas directas (sin grants de cliente y operadas por RPC), pg_net en public porque el scheduler lo usa, 26 SECURITY DEFINER ejecutables por authenticated (con controles is_admin/usuario activo revisados) y leaked-password protection desactivada en Auth.

## Verificación runtime adicional

- Supabase `send-notification` fue desplegada como versión 7 con JWT obligatorio.
- El scheduler `process-scheduled-communications` permanece con `verify_jwt=false` porque usa autenticación propia por secreto de cron; el job de `pg_cron` está activo cada minuto.
- Runtime verificado: 10 propiedades activas, 10 en `propiedades_publicas`, 3 con coordenadas válidas y 1 anuncio publicado/vigente.

## Gate de salida

No se considera listo para merge a `main` ni para binario final hasta completar:

- TypeScript.
- lint.
- tests.
- Expo Doctor.
- export Web.
- prueba Web responsive.
- prueba física Android.
- prueba física iOS.
- pruebas de AuthGate.
- pruebas de Realtime.
- pruebas de publicación/moderación.
- pruebas de almacenamiento público/privado.
- pruebas de notificaciones/anuncios.

## Nota de trazabilidad

Los documentos históricos pueden mencionar `propiedad_id` o alturas anteriores del mapa. El contrato vigente es `propiedades_cambios.property_id` y la altura Web actual 420–680px / 62% del viewport.


## 2026-09-25 — Limpieza responsive del catálogo Web

Se revisó la pantalla `app/(tabs)/properties.tsx` contra `useResponsive()`. El contenedor ya calcula padding y ancho máximo según teléfono/tablet/escritorio, pero algunos estilos internos conservaban `paddingHorizontal: 20`, provocando doble margen en Web y reduciendo innecesariamente el área útil en anchos intermedios.

Se ajustó el catálogo para que:
- encabezado y buscador hereden el padding responsive del contenedor;
- los chips de categorías usen el mismo padding responsive;
- la cuadrícula conserve 1/2/3/4 columnas según el ancho;
- no cambie la fuente de datos ni la seguridad del catálogo.

Commit: `4c321384badce2a49bb22f4117767975cd5ceabf`.

La revisión del `PropertyCard` confirmó que la tarjeta principal usa `width: '100%'` y una relación de aspecto para la imagen, sin un ancho fijo que rompa la cuadrícula. El modo compacto mantiene dimensiones fijas porque se usa como tarjeta horizontal, no como elemento de la cuadrícula principal.

## Estado de verificación

Esta corrección requiere nueva ejecución de CI y prueba visual física en Web, especialmente en 768, 1024, 1280, 1440 y 1920 px. No se considera validada físicamente hasta comprobar esos anchos y al menos un iPhone y un Android.


## 2026-09-25 — Ajuste final de altura del mapa Web

La primera corrección del mapa había reducido la altura a 62% del viewport con mínimo de 420 px. Al revisar la composición completa de la pantalla se detectó que ese mínimo podía dejar poco espacio para el encabezado y la lista de resultados en ventanas Web de poca altura.

Se ajustó a una escala de 55% del viewport, mínimo 320 px y máximo 620 px. El mapa sigue siendo suficientemente amplio en escritorio, pero ahora deja espacio razonable para el contenido que lo rodea en laptops, tablets y ventanas divididas.

Commit: `388b5573ca3564eae8a97dd06ea55f03d6dca47e`.

No se cambió la fuente de datos, Leaflet, OpenStreetMap ni el flujo de navegación. El cambio es exclusivamente de layout Web.


## 2026-09-25 — Favoritos multiplataforma

Se revisó `hooks/use-favorites.ts`. La persistencia de favoritos usa RLS sobre `favoritos` y el seguimiento comercial se realiza mediante `track_property_event`, por lo que no se abrió acceso directo a tablas CRM. Se corrigió un detalle de compatibilidad: `expo-haptics` ya no se ejecuta en Web; la vibración queda limitada a iOS/Android. Commit: `d96e9885dad873ad7dd7967d3b21005b77142bd2`.


## 2026-09-25 — Notificaciones y ajustes multiplataforma

Se auditó el flujo de notificaciones en Web/iOS/Android. `app/notification-settings.tsx` ahora reutiliza `registerPushToken()` en lugar de duplicar la obtención del token y elimina un fallback de projectId hardcodeado que podía divergir de `app.config.ts`. También se hizo responsive el encabezado/tarjeta de configuración y el listado de anuncios. `app/notifications.tsx` ya mantiene el catálogo de notificaciones responsive y ahora el feed de anuncios usa el mismo límite de contenido en escritorio. Commits: `a1035f25081c52f4ad69106c45bb22531de85273`, `7af142db8f8dd806071d0b233ee83a9bdc4c051c`, `8ae6edfa8e064bed2cec5eb7a6d98867c514e739`.


## UX / entrada y registro — 2026-09-25

- Se añadió `components/EyesiteLaunchSplash.tsx`: pantalla de arranque multiplataforma con identidad EYESITE, icono de ojo, pulso suave y transición de entrada. No agrega servicios externos ni depende de Google Cloud.
- `app/_layout.tsx` ahora usa la nueva experiencia durante la carga inicial de autenticación; se conserva la lógica existente de AuthGate y sus rutas de seguridad.
- `app/(auth)/register.tsx`: la contraseña pasa a requerir 8 caracteres, una mayúscula y un número; se añadió guía visual en tiempo real de seguridad 0/3 a 3/3. La aceptación de términos continúa siendo obligatoria antes de enviar el registro.
- La mejora es solo de experiencia/validación del cliente; la autoridad real de acceso continúa en Supabase/Auth/RLS y en el flujo de aprobación existente.
- Pendiente de prueba física: arranque iOS/Android/Web, teclado iOS, creación real de cuenta, confirmación de correo y flujo posterior de perfil/aprobación.
