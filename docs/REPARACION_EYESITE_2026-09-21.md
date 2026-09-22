# EYESITE — Registro de reparaciones
## 21 de septiembre de 2026

Este documento registra las reparaciones realizadas sobre la rama principal durante la revisión de seguridad, persistencia de propiedades, multimedia y documentos.

### 1. Frontera de lectura pública
- La app móvil lee exclusivamente `propiedades_publicas`.
- La app ya no consulta directamente `propiedades`.
- La vista pública expone únicamente los campos necesarios para mostrar propiedades activas.
- Los cambios de propiedades se notifican mediante `propiedades_cambios`; la app vuelve a consultar la vista pública después de cada cambio.
- La lectura directa de `propiedades` para usuarios normales permanece bloqueada.

### 2. RLS de perfiles
- Se consolidaron las políticas de SELECT y UPDATE de `profiles`.
- Un administrador puede gestionar perfiles.
- Un usuario autenticado puede consultar/actualizar su propio perfil sin poder cambiar por sí mismo `role` ni `estado`.

### 3. Moderación administrativa
- Las operaciones de crear/editar/aprobar/rechazar propiedades se realizan mediante RPC administrativas.
- Las RPC administrativas usan `SECURITY DEFINER`, `search_path = public` y comprobación de administrador.
- Se retiró EXECUTE de RPC antiguas/internas que no deben funcionar como API pública: `admin_aprobar_solicitud`, `current_profile_role`, `current_profile_estado` e `is_admin`.

### 4. Realtime
- Se creó `propiedades_cambios` con RLS.
- Un trigger interno registra INSERT/UPDATE/DELETE de propiedades.
- La función del trigger no queda expuesta como RPC a `anon` ni `authenticated`.
- La app escucha esta tabla y después vuelve a leer `propiedades_publicas`.

### 5. Multimedia del panel
- `eyesite-media` se mantiene público para las imágenes/videos aprobados.
- El límite del bucket es 200 MB y admite JPEG, PNG, WebP, GIF, MP4, MOV y M4V.
- `eyesite-private` se mantiene privado para documentos.
- El panel clasifica PDFs y KMZ/KML al guardar una propiedad.
- Se conserva la portada, video, fotografías normales y fotografías profesionales por separado.
- Se corrigió un error real de JavaScript en `public/admin.js`: existía una declaración duplicada de `const originalName` dentro de `uploadFile`, que podía romper la ejecución del archivo completo.
- Se hizo más tolerante la detección MIME para Safari/navegadores que entregan `file.type` vacío, usando también la extensión.
- Se corrigió la validación de videos y fotografías para no rechazar archivos válidos solamente porque el navegador no informó MIME.

### 6. Error MP4 HTTP 400 investigado
El MP4 reportado anteriormente no supera el límite:
- tamaño observado: aproximadamente 8.85 MB;
- tipo almacenado: `video/mp4`;
- bucket: `eyesite-media`;
- existen copias del archivo en Storage.

Por ello el 400 no era un problema de tamaño. La corrección del panel elimina una causa de incompatibilidad por MIME y además registra bucket, ruta, nombre, MIME, tamaño y status de Storage cuando una subida falla.

### 7. Documentos privados
- Se mantiene `eyesite-private` como bucket privado.
- Se añadió la Edge Function `get-property-document`.
- La función valida JWT, perfil activo/admin, propiedad activa y asociación del archivo con la propiedad.
- Devuelve URLs firmadas temporales de una hora.
- Rechaza rutas externas, traversal (`..`) y rutas inválidas.
- La pantalla de detalle solicita los documentos mediante esta función.

### 8. Formularios de propiedades
El panel distingue:
- solo terreno;
- terreno con casa / hacienda / rancho / departamento.

Para propiedades con casa se manejan construcción, recámaras, baños, estacionamientos y plantas. Para publicar se valida título, tipo, municipio, superficie, precio, descripción, estatus legal y fotografía principal.

### 9. Categorías
Se alinearon las categorías compartidas de la app para incluir:
- Casa
- Departamento
- Terreno
- Hacienda
- Rancho
- Industrial
- Local
- Oficina

### 10. Inicio de la app
Si no existe ninguna propiedad marcada como destacada, la sección destacada utiliza las primeras propiedades reales activas en lugar de quedar vacía. No se agregaron datos falsos a la app.

### 11. Calidad
Se añadió GitHub Actions en `.github/workflows/quality.yml` para ejecutar:
- instalación reproducible con pnpm;
- TypeScript (`pnpm check`);
- lint (`pnpm lint`).

No se marca como “pasado” hasta disponer de una ejecución confirmada del workflow.

### 12. Estado actual de seguridad
El Security Advisor de Supabase actualmente reporta:
- 1 ERROR sobre `propiedades_publicas` como SECURITY DEFINER view;
- 1 WARN sobre `pg_net` en schema `public`;
- 17 WARN sobre funciones administrativas SECURITY DEFINER ejecutables por usuarios autenticados;
- 1 WARN por protección contra contraseñas filtradas desactivada.

Los 17 RPC administrativas no se revocan ciegamente porque el panel de administración depende de ellas y sus cuerpos ya fueron auditados para comprobar autorización de administrador y `search_path`.

La vista `propiedades_publicas` es deliberadamente el puente público de lectura mientras el acceso directo a `propiedades` está bloqueado. Eliminar SECURITY DEFINER sin rediseñar esta frontera podría romper la seguridad y la lectura de la app.

### 13. Migraciones/commits relevantes
- `20260921150000_security_public_property_documents_boundary.sql`
- `20260921164700_security_property_select_and_duplicate_indexes.sql`
- `20260921172000_security_profiles_rls_consolidation.sql`
- `20260921173500_secure_property_realtime_feed.sql`
- `20260921180500_security_realtime_trigger_execute.sql`
- `20260921190000_security_revoke_legacy_rpc_execute.sql`
- `20260921200000_security_revoke_is_admin_rpc_execute.sql`
- reparación multimedia actual de `public/admin.js`: commit `239f48b7873ec793b5df434f975774bceddce83c`

### 14. Pendientes técnicos identificados
1. Ejecutar/confirmar el workflow de calidad de GitHub en una ejecución visible.
2. Continuar E2E de alta/edición/aprobación de propiedad.
3. Confirmar desde el panel real que un cambio editado aparece inmediatamente en la app.
4. Terminar la investigación del 400 de Storage si vuelve a aparecer después de la corrección MIME.
5. Evaluar por separado la migración de `pg_net` y la configuración de protección de contraseñas.
6. No eliminar buckets legacy mientras existan objetos sin migración comprobada.

### 15. Regla de arquitectura
EYESITE continúa por la ruta **sin Google Cloud**. El mapa usa Leaflet/OpenStreetMap y la seguridad de datos/media depende de Supabase, RLS, RPC administrativas y URLs firmadas para documentos privados.


## 16. Auditoría funcional completa — registro, recuperación y comunicación

Durante la revisión funcional posterior se detectaron y corrigieron estos puntos:

- **Recuperación de contraseña:** la pantalla anterior solamente mostraba un mensaje simulado y no llamaba a Supabase Auth. Ahora usa `resetPasswordForEmail`, enlace de recuperación con el esquema `eyesite://`, callback de recuperación y una pantalla `reset-password` que usa `auth.updateUser({ password })`.
- **Perfil:** `create-profile` ya no sobrescribe una aceptación legal existente con `false` durante un nuevo upsert.
- **Notificaciones de bajada de precio:** el panel intentaba consultar `favoritos` directamente. La RLS de favoritos permite al usuario consultar sus propios favoritos, no al administrador todos los favoritos, por lo que esa consulta podía devolver error. Ahora la propiedad se envía a `send-notification`, que con service role resuelve los favoritos de forma segura. Además crea la notificación dentro de la app y envía push cuando hay token.
- **Notificaciones en app:** el flujo existente carga únicamente comunicaciones con `estado_envio = sent` y cuya fecha programada ya llegó; marca individualmente o en lote como leídas mediante RPC protegidas.
- **Anuncios:** el panel permite portada, galería, enlace, etiqueta del enlace, prioridad, programación y caducidad. La app filtra anuncios activos/publicados y elimina de la presentación los caducados.
- **Programación:** existe un job `pg_cron` cada minuto llamado `eyesite-process-communications` que ejecuta `process-scheduled-communications`; este publica notificaciones/anuncios vencidos y procesa push. El endpoint está protegido por un secreto almacenado en Vault.
- **Push:** se registran tokens Expo en `profiles.expo_push_token`; los tokens no registrados se eliminan cuando Expo devuelve `DeviceNotRegistered`.
- **Limitación actual de push:** el envío remoto requiere una build nativa configurada para push; Expo Go no se usa para push remoto Android. La notificación dentro de la app sigue siendo independiente del push.
- **Registro/términos:** el registro tiene una primera aceptación visual y después existe una pantalla legal separada que guarda `terminos_aceptados`, fecha y versión. La segunda pantalla es actualmente la fuente persistente de aceptación. Esto puede simplificarse en una siguiente mejora para evitar que el usuario sienta que acepta dos veces.
- **Flujo de verificación:** existe reenvío de confirmación desde `verify-email`. El callback soporta códigos y `token_hash`.
- **Área de favoritos:** la app consulta los IDs propios y cruza contra las propiedades públicas; esto respeta la frontera de seguridad.

## 17. Mejoras recomendadas de producto

1. Unificar el consentimiento legal en un único paso antes de finalizar el registro y registrar también una versión exacta de cada documento legal.
2. Añadir preferencias de comunicación por usuario: push, anuncios, cambios de precio, nuevas propiedades y contacto comercial.
3. Añadir deep links desde una notificación hacia la propiedad/anuncio correspondiente en lugar de abrir solamente la bandeja.
4. Añadir estadísticas al panel: enviados, entregados/aceptados por Expo, fallidos, leídos y tasa de lectura.
5. Añadir reintento controlado para push fallidos transitorios y limpieza de tokens inválidos.
6. Para anuncios, añadir estado visible `borrador / programado / publicado / caducado / cancelado` y una vista previa móvil antes de publicar.
7. Añadir segmentación futura de anuncios por ciudad, presupuesto, favoritos o tipo de propiedad; debe hacerse mediante criterios explícitos, no inferencias.
8. Añadir una cola de auditoría de acciones administrativas para saber quién creó/editó/publicó/eliminó una comunicación o propiedad.
9. Añadir pruebas E2E para: registro, confirmación, perfil, términos, aprobación, login, recuperación de contraseña, favorito, publicación de propiedad, anuncio programado y push.


## 18. Auditoría adicional y reparaciones aplicadas — 2026-09-21 (continuación)

Se realizó una segunda revisión directamente contra el proyecto Supabase de producción y el repositorio principal.

### Estado verificado
- Proyecto Supabase activo y saludable; PostgreSQL 17.6.1.
- Las tablas críticas revisadas mantienen RLS activo: `profiles`, `propiedades`, `favoritos`, `notificaciones`, `anuncios` y `propiedades_cambios`.
- `notificaciones` contiene actualmente comunicaciones de prueba/uso real y conserva índice único parcial por `event_key`, evitando duplicados cuando se proporciona una clave de evento.
- `anuncios` tiene flujo de publicación programada y expiración procesado por `process-scheduled-communications`.
- El secreto del scheduler no es ejecutable por `anon` ni `authenticated`; el endpoint programado valida el secreto antes de procesar comunicaciones.
- Las funciones administrativas SECURITY DEFINER siguen protegidas por comprobación de administrador; no se revocaron porque el panel depende de ellas.
- Security Advisor continúa mostrando como pendientes: la vista SECURITY DEFINER `propiedades_publicas` (puente público intencional), `pg_net` en `public`, las funciones administrativas SECURITY DEFINER ejecutables por usuarios autenticados y la protección contra contraseñas filtradas desactivada. No se hizo un cambio destructivo para ocultar estas advertencias porque podría romper la arquitectura actual; la protección de contraseñas debe activarse desde Auth y la vista pública requiere una migración de arquitectura si se quiere eliminar el SECURITY DEFINER.
- Performance Advisor reporta índices sin uso. No se eliminaron automáticamente porque el proyecto todavía está en fase de pruebas y algunos índices corresponden a consultas que se utilizarán cuando aumente el tráfico.

### Reparaciones nuevas en la app
- **Deep link de notificaciones:** al tocar una notificación que contiene `data.property_id`, la app ahora marca la notificación como leída y abre directamente `/property/[id]`. Esto conecta las alertas de precio y otras comunicaciones de propiedad con la ficha correspondiente.
- **Errores legales visibles:** la pantalla de términos ahora muestra un Alert si falla el guardado de la aceptación. Antes el error solamente quedaba en consola y el usuario podía quedar sin saber por qué no podía continuar.

### Hallazgos que quedan documentados
- El registro sigue teniendo una aceptación visual inicial y después una pantalla legal persistente. La segunda pantalla es la que realmente guarda la aceptación en Supabase. Esto funciona, pero puede simplificarse para que exista un único consentimiento claro.
- La pantalla legal actualmente guarda un único campo persistente `terminos_aceptados` aunque presenta tres consentimientos diferenciados (Términos, Aviso de Privacidad y autorización de contacto). Para una versión legal más robusta conviene separar esos consentimientos, sus fechas y sus versiones, pero debe hacerse junto con la lógica de `AuthGate` para no bloquear usuarios existentes accidentalmente.
- Los anuncios se muestran en la pestaña de comunicación y pueden enviar push al publicarse, pero el push de anuncio no crea por sí mismo una fila individual de `notificaciones` para cada usuario. Si se quiere una bandeja unificada de anuncios + notificaciones, debe diseñarse con una clave idempotente por anuncio/usuario antes de activarlo para todos.
- El scheduler marca una notificación como `sent` antes de intentar el push. Esto es correcto para la entrega dentro de la app, pero significa que un fallo de push no convierte automáticamente la notificación en pendiente otra vez. La mejora adecuada es separar explícitamente estado de entrega in-app y estado de push antes de implementar reintentos.

### Próximo bloque recomendado
1. Unificar legal/consentimientos sin romper cuentas existentes.
2. Añadir preferencias de comunicación por usuario.
3. Añadir métricas de anuncios/notificaciones y estado de push.
4. Diseñar reintentos de push con backoff e invalidación de tokens.
5. Crear pruebas E2E del flujo completo de registro → verificación → perfil → términos → aprobación → notificaciones.


## 19. Revisión de rendimiento y flujo de comunicaciones — 2026-09-21

Se revisaron los índices de las tablas de comunicación y del flujo de usuarios/propiedades. No se eliminaron índices solo porque aparezcan como poco usados: el proyecto todavía está en pruebas y varios cubren consultas esperadas del panel o del crecimiento futuro.

### Observaciones
- `notificaciones` ya tiene índices adecuados para bandeja por usuario, no leídas y programación.
- `anuncios` tiene índices para publicaciones activas y programación. Se mantiene un índice adicional de publicación porque su utilidad debe medirse con tráfico real antes de decidir una limpieza.
- `favoritos` conserva índice único usuario+propiedad y búsquedas por usuario y propiedad, necesarios para favoritos y alertas de precio.
- `propiedades` tiene índices para estado/fecha, usuario, orden y coordenadas de propiedades activas.
- No se ejecutó una limpieza automática de índices porque podría empeorar el rendimiento del panel o del scheduler sin métricas de producción suficientes.

### Criterio adoptado
Los siguientes cambios de base de datos deberán seguir siendo migraciones versionadas. Antes de eliminar índices o cambiar RLS se comprobará el uso real mediante estadísticas de PostgreSQL y el plan de las consultas afectadas.


## 20. Corrección de deep link en push — 2026-09-21

Se detectó una diferencia entre la notificación interna y el push remoto: la fila de `notificaciones` conservaba `data.property_id`, pero el payload enviado a Expo solamente incluía `tipo`. Por eso la nueva navegación directa de la bandeja no podía extenderse al toque de una notificación push.

Se corrigió `send-notification` para conservar los datos de navegación de `body.data` en el payload de Expo, además del tipo. Esto permite que futuras notificaciones push de propiedades puedan abrir directamente la ficha cuando se conecte el manejador de eventos de notificación del cliente.

Commit: `a9fd0a9fcb5034879e968312fa3baed85aacbc3a`.


## 21. Navegación al tocar push remoto — 2026-09-21

Se completó el segundo lado del deep link de notificaciones. El layout raíz de la app ahora registra `addNotificationResponseReceivedListener` de Expo Notifications y lee `property_id` / `announcement_id` del payload recibido.

### Comportamiento
- Push con `property_id`: abre directamente `/property/[id]`.
- Push con `announcement_id`: abre la pantalla de comunicación/notificaciones y conserva el identificador para el flujo posterior.
- Push sin identificador específico: abre la pantalla de notificaciones.
- También se consulta `getLastNotificationResponseAsync()` para cubrir el caso en que el usuario toca el push mientras la aplicación estaba cerrada y la app se inicia desde esa interacción.
- La suscripción se elimina al desmontar el layout para evitar listeners duplicados.

Commit: `dd19e2f152d9f1b30cfd54a814538e6bd709effa`.

### Verificación pendiente
El cambio quedó versionado en GitHub. El workflow de calidad todavía no reporta una ejecución asociada a este commit, por lo que no se declara CI verde hasta que exista una ejecución verificable.
