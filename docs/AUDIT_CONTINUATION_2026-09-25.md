# EYESITE — Auditoría intensiva y reparaciones 2026-09-25

## Rama de trabajo

- Base auditada: `feature/eyesite-commercial-crm`.
- Rama de reparación: `fix/eyesite-platform-security-20260925`.
- `main` permanece sin modificaciones.

## Correcciones verificadas

### 1. Realtime de detalle de propiedad

`hooks/use-properties.ts` usa la vista pública `propiedades_publicas` y el feed `propiedades_cambios` con `property_id=eq.<id>`. La limpieza del canal usa la generación de canal para evitar listeners obsoletos.

### 2. Mapa Web responsive

`app/(tabs)/map.tsx` usa una altura Web calculada con el viewport: mínimo 320px, máximo 620px y 55% de la altura disponible. Esto evita que el mapa domine pantallas de escritorio y mantiene una superficie útil en tablets.

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

Los documentos históricos pueden mencionar `propiedad_id` o alturas anteriores del mapa. El contrato vigente es `propiedades_cambios.property_id` y la altura Web actual 320–620px / 55% del viewport.


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


## Perfil responsive — continuación 2026-09-25

- `app/(auth)/create-profile.tsx` ahora usa `useResponsive()` para padding horizontal y ancho máximo en escritorio, evitando que el formulario se estire excesivamente en Web/tablet.
- El teclado iOS conserva `KeyboardAvoidingView` con comportamiento `padding`; los campos siguen usando controles nativos compatibles con Android/Web.
- Se mantuvo el `upsert` de `profiles` limitado al usuario autenticado y no se modificaron rol/estado desde el cliente.


## Auditoría rigurosa de Auth — 2026-09-25

- Se revisaron `useAuth.tsx`, `app/_layout.tsx`, callback de confirmación y términos.
- `useAuth` mantiene un único listener de Supabase Auth y un único canal Realtime de `profiles`; al cambiar el estado administrativo vuelve a consultar el perfil.
- `AuthGate` mantiene el orden de seguridad: correo confirmado → perfil → estado administrativo (rechazado/suspendido/pending) → términos → aplicación.
- El cliente no puede establecer rol/estado al crear perfil; el formulario solo envía identidad y datos de perfil.
- Se detectó y corrigió un defecto introducido en la guía de contraseña: una edición había dejado saltos de línea literales y una expresión regular incorrecta; el commit `5630557c8c9187ea67726275b712afae6907001e` deja la validación como código TypeScript válido y usa `/\\d/` para detectar números.
- `terms.tsx` ahora limita su ancho en Web/escritorio mediante `useResponsive`, evitando un panel excesivamente ancho; conserva el requisito de leer y aceptar los tres bloques.
- El callback acepta enlaces con `code` y `token_hash`, elimina el riesgo de procesar repetidamente el mismo enlace durante la vida del componente y limpia el listener al desmontar.
- CI: los commits recientes ya generan ejecuciones en GitHub Actions. En este momento las ejecuciones de los commits `5630557c...` y `fe05503d...` estaban en cola; no se deben considerar aprobadas hasta finalizar.
- Pruebas físicas todavía necesarias: correo real en iOS/Android/Web, enlace universal/deep link, enlace ya usado, recuperación de contraseña, teclado iOS, sesión persistente, cambio pendiente→activa mientras la app permanece abierta y acceso directo a rutas protegidas.


## Recuperación de contraseña — auditoría estricta 2026-09-25

- Se verificó el flujo `forgot-password → auth/callback → reset-password`.
- El formulario de recuperación ya devuelve un mensaje genérico para errores del proveedor, conservando un mensaje específico únicamente para rate limiting; no se muestran detalles internos de Supabase al usuario.
- La nueva contraseña recuperada exige la misma política mínima del registro: 8 caracteres, una mayúscula y un número.
- Se detectó durante la edición un cierre JSX incorrecto en `app/reset-password.tsx`; la modificación defectuosa fue retirada del historial activo mediante retorno controlado de la rama y se reaplicó solo el cambio seguro de política. El archivo actual debe pasar TypeScript/ESLint antes de considerarse cerrado.
- No se considera suficiente revisar código: falta prueba real de enlace expirado/reutilizado, recuperación en iOS/Android/Web, sesión de recuperación, actualización efectiva y cierre posterior de la sesión.


## Auditoría estricta — notificaciones, favoritos, push y navegación — 2026-09-25

Se revisó el circuito completo de centro de notificaciones, preferencias, Realtime, favoritos, analítica comercial y apertura de propiedades desde una notificación.

### Hallazgos y corrección aplicada

- hooks/use-notifications.ts mantiene la carga de notificaciones con filtro por user_id, exige sesión cuyo UUID coincide con el usuario solicitado y usa RLS para el acceso real.
- marcar_notificacion_leida y marcar_todas_notificaciones_leidas se verificaron en producción: ambas exigen usuario activo y actualizan exclusivamente filas pertenecientes a auth.uid().
- registrar_anuncio_evento se verificó en producción: exige usuario activo, acepta solo opened o clicked y registra la entrega únicamente para auth.uid().
- Al abrir una notificación con property_id, la navegación puede recibir un UUID arbitrario, pero la pantalla de detalle no confía en él: vuelve a consultar exclusivamente propiedades_publicas con estado='activa'. Una propiedad retirada, inexistente o no publicada termina en “Propiedad no encontrada” y no expone propiedades directa.
- Los favoritos tienen RLS de producción select/insert/delete own y requieren private.is_active_user(). La mutación incluye user_id=auth.uid() en las operaciones de cliente; el CRM solo recibe eventos a través de track_property_event y valida que la propiedad siga pública/activa.
- Se detectó una mejora de defensa en profundidad en registerPushToken(): anteriormente el userId recibido por el llamador también se utilizaba directamente para seleccionar el perfil a actualizar. Aunque RLS ya limitaba el cambio, ahora la función primero obtiene la sesión actual y exige coincidencia exacta entre session.user.id y el identificador de ciclo de vida antes de guardar el token. El UPDATE final usa el UUID obtenido de la sesión, no uno impuesto externamente.
- Commit de la corrección: 9752aaebbc144e3ba45274d1855a11ae37dd7e59.

### Compatibilidad de plataforma

- Web no intenta registrar push remoto; conserva el centro de notificaciones in-app y Realtime.
- iOS/Android usan expo-notifications solo fuera de Web/Expo Go; Android crea el canal default.
- El listener global de respuestas push se crea una sola vez en el layout raíz y se elimina al desmontar. Se evita registrar el listener nativo en Web.

### Estado

La corrección de identidad del token push quedó aplicada en la rama aislada. El commit no mostró todavía una ejecución de GitHub Actions asociada al SHA al momento de esta auditoría, por lo que CI de este cambio queda pendiente de confirmación. No se modifica main ni se considera este bloque físicamente validado hasta ejecutar build/lint/TypeScript y pruebas reales de push en iOS/Android.

### Endurecimiento adicional de sesión — 2026-09-25

Siguiendo la documentación actual de Supabase, el circuito de notificaciones/push dejó de basarse en getSession() para verificar identidad antes de operaciones sensibles y ahora usa auth.getUser(), que valida el usuario contra Auth. La sesión sigue siendo el contexto de la aplicación, pero la identidad usada para cargar notificaciones y guardar el token se obtiene del servidor de Auth. Commit: 4fd1cb229911241672b10c2917c075e1604bce6a.


## CI — corrección de lanzamiento EYESITE — 2026-09-25

El run 396 confirmó native-config exitoso (generación iOS + Privacy Manifest), mientras quality falló exclusivamente en ESLint por el nuevo componente EyesiteLaunchSplash: React Hooks detectó lecturas de ref durante render. Se verificó el log exacto antes de modificarlo. Se sustituyeron los Animated.Value almacenados como useRef(...).current por estado inicializado de forma perezosa, manteniendo referencias estables sin leer ref.current durante render. Commit: 81e3ee895529075ae1c3787f0f04b9947f846f67. Los runs posteriores confirmaron el cierre de esta corrección: el SHA `abe96bfc7b4e91df77550b2e40795c75ed662637` obtuvo `quality=success` y `native-config=success`.

## Recuperación de contraseña — cierre de código 2026-09-25

Se completó el endurecimiento del circuito de recuperación en la rama aislada `fix/eyesite-platform-security-20260925`:
- `app/_layout.tsx` excluye explícitamente `reset-password` del conjunto protegido y evita redirecciones automáticas mientras se procesa `(auth)/callback`.
- `app/(auth)/callback.tsx` escucha `PASSWORD_RECOVERY`, admite `code`/PKCE y `token_hash`, y dirige la recuperación a `reset-password`.
- `app/reset-password.tsx` cierra la sesión después de actualizar correctamente la contraseña, obligando al siguiente acceso a pasar por el flujo normal de autenticación y aprobación.
- Verificación CI del SHA `abe96bfc7b4e91df77550b2e40795c75ed662637`: `quality=success`, `native-config=success`.

El código queda cerrado a nivel estático. Siguen pendientes las pruebas físicas de enlaces válidos, expirados/reutilizados y recuperación real en iOS, Android y Web.


## Escalabilidad — scheduler y comunicaciones 2026-09-25

Se realizó una revisión específica para crecimiento a muchos usuarios y propiedades. La ejecución ya era asíncrona (Edge Function + pg_cron + pg_net), pero había dos problemas de escala que no convenía dejar para después:

- El scheduler podía solaparse si una ejecución tardaba más que el intervalo de un minuto. Se añadió un lease de 90 segundos en `eyesite_scheduler_lock`, reclamado/liberado exclusivamente por el rol `service_role`. Si otra ejecución entra mientras el lease está vigente, termina rápidamente con `scheduler_locked`. El lease evita que un fallo deje el scheduler bloqueado indefinidamente.
- Los anuncios publicados se recorrían cada minuto y podían volver a ejecutar el `upsert` de todas las entregas. Se añadió `anuncios.entregas_generadas_at` e índice parcial; la generación de destinatarios se hace una sola vez por anuncio y después el scheduler procesa únicamente entregas pendientes/error.
- La generación de entregas se hace en lotes de 500 para no construir una sola petición SQL enorme.
- El envío a Expo se ajustó al límite documentado actualmente de 100 mensajes por petición y se dejó preparado para concurrencia controlada de hasta 3 lotes, en lugar de una ráfaga ilimitada. Expo recomienda limitar conexiones concurrentes y documenta el máximo de 100 mensajes por petición.
- El procesamiento de entregas consulta anuncios y perfiles en bloque para evitar una consulta de perfil/anuncio por cada fila. Las actualizaciones individuales restantes tienen concurrencia acotada para no abrir cientos de conexiones simultáneas.
- El cron de producción sigue activo cada minuto y, después del despliegue, las ejecuciones recientes registradas por `cron.job_run_details` continúan en estado `succeeded`. No se modificó el intervalo de un minuto porque el nuevo lease y el procesamiento por lotes permiten absorber crecimiento sin crear ejecuciones superpuestas.

### Cambios de código/BD

- Edge Function: `supabase/functions/process-scheduled-communications/index.ts`
- Migración: `supabase/migrations/20260925203000_scale_scheduled_communications.sql`
- Despliegue de Edge Function: versión 3, estado ACTIVE.
- Commit de implementación: `37bcd31bff13ce2c5f6efd815d6169e3b52bc5f0`.
- Commit de migración: `0da81f2f648793042c2a32e98f543889a00c6ed9`.
- Validación directa del lock: primera reclamación `true`, segunda reclamación simultánea `false`, liberación `true`.
- Se ejecutó además una invocación manual mediante el mismo mecanismo de `pg_net` usado por producción; el endpoint respondió HTTP 200 y el cron continuó registrando ejecuciones exitosas.

### Riesgo todavía abierto

El siguiente escalón de escala es el catálogo/mapa: `useProperties()` actualmente descarga todas las filas públicas activas y el mapa calcula distancias en el cliente. Con cientos o miles de propiedades esto aumenta memoria, transferencia y tiempo de render. La siguiente mejora debe ser consulta por páginas para catálogo y consulta geográfica por región/viewport para mapa, manteniendo siempre `propiedades_publicas` como frontera de lectura y sin introducir Google Cloud.


### Push inmediato — corrección adicional 2026-09-25

Se encontró un segundo límite real en `send-notification`: el endpoint permitía hasta 500 destinatarios, pero enviaba todos en una sola petición a Expo. La documentación actual de Expo limita cada petición a 100 mensajes y recomienda limitar la concurrencia. Se corrigió sin cambiar el límite funcional de destinatarios:
- se divide el envío en lotes de máximo 100;
- las actualizaciones de entregas usan concurrencia acotada a 10;
- no se permite una ráfaga ilimitada de conexiones;
- los tokens `DeviceNotRegistered` se limpian del perfil;
- la Edge Function quedó desplegada como versión 8, con JWT obligatorio.

Esto evita que un envío administrativo de 101–500 usuarios falle por exceder el límite de Expo y mantiene compatibilidad iOS/Android mediante el mismo Expo Push Service.


## Escalabilidad — mapa geográfico 2026-09-25

Se corrigió el siguiente cuello de botella detectado en la auditoría: el mapa reutilizaba `useProperties()` y por tanto descargaba todas las propiedades públicas activas, aunque el usuario solo necesitara las de su zona.

Se implementó:
- RPC `get_public_map_properties(lat, lon, radius, limit)` como `SECURITY INVOKER`.
- La consulta sigue partiendo exclusivamente de `propiedades_publicas`.
- Filtro geográfico en PostgreSQL mediante bounding box + distancia Haversine.
- Respuesta limitada a campos ligeros necesarios para los marcadores.
- Límite defensivo de 500 resultados.
- Índice parcial `idx_propiedades_publicas_map_coords` sobre coordenadas de propiedades activas.
- En móvil, tras obtener ubicación, el mapa consulta un radio de 100 km.
- Sin ubicación, usa 250 km alrededor de Mérida como zona inicial.
- En Web, el usuario puede activar geolocalización con el botón y entonces se cambia al radio cercano.
- El centro visual del mapa ahora acompaña la ubicación del usuario cuando está disponible.

Esto reduce transferencia, memoria y render del mapa a medida que crece el catálogo, sin Google Cloud y sin exponer la tabla privada `propiedades`.

Validación de producción:
- RPC ejecutado directamente con el centro de Mérida y radio de 250 km.
- Devuelve únicamente propiedades activas con coordenadas válidas.
- Actualmente encontró 3 propiedades ubicadas en esa zona.
- La migración versionada corresponde a `supabase/migrations/20260925210000_scale_public_map_queries.sql`.


## Escalado del catálogo y mapa Web — 2026-09-25

- El catálogo público ya no descarga toda la vista `propiedades_publicas` en cada entrada cuando se usa la pantalla de oportunidades. `useProperties(options)` admite filtros de servidor (texto, municipio, tipo, precio y superficie), selecciona únicamente campos necesarios para las tarjetas y pagina en bloques de 24 con `onEndReached`.
- La paginación solicita una fila adicional para detectar `hasMore`, evitando un `count=exact` por página. Se añadió protección contra respuestas antiguas que lleguen después de cambiar filtros.
- Se mantuvo la ruta pública `propiedades_publicas`; no se expone ni consulta directamente `propiedades` desde el cliente.
- La pantalla de propiedades conserva búsqueda, filtros, favoritos, búsquedas guardadas y Realtime; el detalle continúa consultando la vista pública completa mediante `useProperty`.
- El mapa Web ahora ajusta su altura por clase de viewport: teléfono, tablet y escritorio tienen límites distintos para evitar mapas demasiado pequeños o excesivamente altos. El iframe Leaflet sigue ocupando todo el contenedor y conserva `invalidateSize()` al redimensionar.
- No se añadió Google Maps ni Google Cloud; el mapa continúa con Leaflet/OpenStreetMap.

- Runtime: se verificó que `propiedades_publicas` es una tabla-cache pública y se añadieron índices parciales para catálogo por `created_at`, `tipo`, `precio_actual` y `superficie`, limitados a propiedades activas. La migración quedó registrada en Supabase con versión `20260925202402` y el archivo del repositorio fue alineado a esa versión.


## 2026-09-25 — Escalado del catálogo público y corrección de búsqueda web

- Se verificó que `hooks/use-properties.ts` ya usa paginación server-side sobre `propiedades_publicas` en modo catálogo: páginas de 24 (máximo 48), filtros de búsqueda/municipio/tipo/precio/superficie aplicados en Supabase y `loadMore` para carga incremental.
- Se verificó que `app/(tabs)/properties.tsx` ya consume `hasMore`/`loadMore` y conserva la interfaz responsive de 1–4 columnas.
- Se corrigió un literal de template mal escapado en el contador del catálogo que podía producir JSX/TS inválido.
- Se añadió debounce de 300 ms a la búsqueda de texto para evitar una consulta de Supabase por cada pulsación del usuario.
- No se modificó el contrato de detalle, favoritos, búsquedas guardadas ni el feed Realtime.
- El cambio queda aislado en `fix/eyesite-platform-security-20260925`; no se tocó `main`.
- CI del commit de esta corrección queda pendiente de ejecución/confirmación; no se marca como aprobado hasta recibir el resultado real de GitHub Actions.


## Escalabilidad de transferencia del catálogo y Realtime — 2026-09-25

Se revisó el flujo de lectura del catálogo pensando en múltiples usuarios y un número creciente de propiedades.

- El catálogo ya usa paginación de 24 elementos; se conserva esa estrategia.
- Se redujo el payload de cada página: el listado ya no solicita PDFs, KMZ/KML, JSON pesados, arrays de videos ni `fotos_pro`. Se mantienen únicamente los datos necesarios para tarjetas, filtros, ubicación y portada/fallback.
- El detalle de propiedad continúa solicitando el registro completo únicamente cuando el usuario entra a una propiedad.
- El canal Realtime de `propiedades_cambios` ahora agrupa cambios consecutivos durante 500 ms antes de volver a consultar el catálogo. Esto evita una ráfaga de lecturas cuando el administrador publica o edita varios campos seguidos.
- La instalación de `pg_trgm` se revisó y **no está instalada actualmente** en el proyecto. Se descartó una migración de índices trigramas porque habría fallado en producción. No se instala una extensión solo por anticipar crecimiento; primero se medirá el patrón real y, si hace falta, se evaluará habilitarla mediante el mecanismo soportado por Supabase.
- El asesor de rendimiento reporta varios índices sin uso histórico. No se eliminan automáticamente: algunos pueden estar preparados para crecimiento futuro y eliminarlos ahora sería una optimización prematura.

Estado: cambio de cliente aplicado en rama aislada; requiere CI y prueba Web/iOS/Android antes de considerarlo cerrado.
