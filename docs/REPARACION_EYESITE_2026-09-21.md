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


## 22. Corrección de divergencia entre GitHub y Edge Function de push — 2026-09-21

Durante la verificación del flujo se detectó una divergencia real: `supabase/functions/send-notification/index.ts` ya contenía en GitHub la lógica de favoritos e in-app, pero la versión activa de Supabase todavía era la versión 4 y no conservaba los identificadores de navegación en el payload. Esto podía provocar que el código del repositorio pareciera reparado mientras el backend ejecutaba una versión anterior.

Se desplegó la versión 5 de `send-notification` directamente desde el archivo versionado. Ahora:
- `property_id` y `announcement_id` enviados en el cuerpo se incorporan al `data` del push.
- Los mismos identificadores quedan en `notificaciones.data` cuando `in_app` está activo.
- Se mantiene la resolución de favoritos para alertas de precio.
- Los tokens `DeviceNotRegistered` siguen invalidándose en `profiles`.

Verificación posterior: la función quedó `ACTIVE`, versión `5`, con hash `4e4f7b38e060073e72cf1dcadb6fd66dbc98fcc9de91fdef2df4291d80f5673e`.

Commit del código: `7586008b98996d0b87815cdaa005a77dadf3c1d8`.


## 23. Preferencias de notificaciones y reintentos de push — 2026-09-22

Se añadió una capa explícita para que cada usuario pueda controlar:
- `notificaciones_in_app`
- `notificaciones_push`
- `anuncios_push`

También se separó el estado de entrega in-app del estado de push. `notificaciones` ahora conserva `push_status`, `push_attempts` y `push_next_retry_at`, permitiendo reintentos sin ocultar una notificación que ya está disponible dentro de la app.

El Edge Function `send-notification` quedó desplegado en versión 6 y respeta las preferencias del perfil.

El scheduler `process-scheduled-communications` quedó desplegado en versión 2. Ahora:
- procesa comunicaciones programadas;
- intenta push sólo cuando la preferencia lo permite;
- registra intentos;
- reintenta fallos en ventanas de 5, 15 y 60 minutos;
- invalida tokens `DeviceNotRegistered`;
- mantiene separado el estado in-app del push.

## 24. Entrega y analítica por usuario de anuncios — 2026-09-22

Se creó `anuncio_entregas`, una fila por anuncio y usuario, para poder registrar entrega push, intentos, errores, apertura y clic.

Se añadió el RPC `registrar_anuncio_evento(uuid,text)`, limitado a los eventos `opened` y `clicked`, para que la propia app registre interacción del usuario sin exponer escritura directa de la tabla.

La pantalla de comunicaciones ahora:
- abre anuncios desde pushes;
- registra aperturas;
- registra clics en enlaces;
- ofrece una pantalla de preferencias de notificaciones.

La navegación al tocar un push conserva el comportamiento de abrir la propiedad cuando existe `property_id`, o comunicaciones cuando existe `announcement_id`. Expo documenta precisamente el uso de `addNotificationResponseReceivedListener` y de la respuesta inicial para cubrir aperturas desde segundo plano o arranque. citeturn0search0turn0search4

## 25. Corrección adicional de onboarding — 2026-09-22

Se detectó que `create-profile.tsx` enviaba `role: 'user'` y `estado: 'pendiente'` en cada upsert. Esto podía intentar sobrescribir una aprobación administrativa existente y chocaba con la frontera de seguridad de perfiles.

Se eliminó esa escritura: el onboarding sólo actualiza los datos personales y deja que el esquema/RLS conserve el rol y estado administrativos.

Migraciones:
- `20260922150000_add_notification_preferences_and_push_retry.sql`
- `20260922150500_add_announcement_delivery_analytics.sql`

Commits principales:
- `f0a003afba728a2b935bd1542fd5dac4c4dbb592`
- `5db466d30a6bf90da7e141f23900018a90c55453`
- `ca65e967a2471a782de05ceb6f1336c5f4ed4f33`
- `b2fd9488d07e319b53d6f3051b62630a0076f66c`
- `d22fa17b0f6ed7b6fa1c8a50f039cdbfdfc66959`


## 26. Revisión final de seguridad después de comunicaciones — 2026-09-22

Después de crear `anuncio_entregas` apareció temporalmente un aviso porque el RPC de eventos de anuncios podía ser ejecutado por `anon`. Se corrigió explícitamente: `registrar_anuncio_evento(uuid,text)` sólo queda ejecutable por `authenticated`.

También se optimizó su política RLS para evaluar `auth.uid()` mediante subconsulta estable y evitar el aviso de init-plan.

Estado actual de advisors:
- El nuevo RPC ya no aparece como ejecutable por `anon`.
- Continúan los hallazgos conocidos: `propiedades_publicas` SECURITY DEFINER, `pg_net` en public, funciones administrativas SECURITY DEFINER ejecutables por authenticated y protección contra contraseñas filtradas desactivada.
- Los índices sin uso siguen siendo informativos; no se eliminaron mientras EYESITE continúa en etapa de pruebas.

Últimas migraciones:
- `20260922151000_lock_announcement_event_rpc_execute.sql`
- `20260922151500_optimize_announcement_delivery_rls.sql`


## 27. Seguridad de acceso por estado de perfil — 2026-09-22

Se cerró una brecha de autorización que no debía depender únicamente de la navegación de la app. Antes, un usuario suspendido/rechazado o pendiente podía conservar un JWT válido y, mediante llamadas directas al Data API, todavía intentar acceder a algunos datos propios porque varias políticas sólo comprobaban `auth.uid()`.

### Reparación aplicada
Se creó la función interna `private.is_active_user()`, que comprueba el estado actual de `profiles` directamente en la base de datos. La función no queda expuesta como RPC.

Las políticas quedaron reforzadas para exigir `estado = 'activa'` en:
- `favoritos`: SELECT, INSERT y DELETE propios;
- `solicitudes_propiedades`: SELECT e INSERT propios;
- `notificaciones`: SELECT propio;
- `anuncio_entregas`: SELECT propio;
- edición del propio `profiles`.

Los administradores conservan sus rutas administrativas mediante `private.is_admin()`.

El SELECT del propio perfil sigue disponible para cualquier usuario autenticado porque `AuthGate` necesita conocer `estado` para enviar correctamente a pendiente/denegado. Esto evita romper el flujo de onboarding mientras bloquea el acceso a los datos de negocio cuando el estado no es activo.

También se endurecieron los RPC de usuario:
- `marcar_notificacion_leida(uuid)` devuelve `false` para perfiles inactivos;
- `marcar_todas_notificaciones_leidas()` devuelve `0` para perfiles inactivos;
- `registrar_anuncio_evento(uuid,text)` no registra aperturas/clics para perfiles inactivos.

Durante la verificación se encontró además una política antigua duplicada en `anuncio_entregas` (`anuncio_entregas_select_own`) que habría permitido acceso independientemente del nuevo estado. Fue eliminada inmediatamente.

### Migraciones
- `20260922153000_security_active_profile_data_access.sql` — commit `1834282598428bf61a093730b6d9187f525bc5a0`.
- `20260922153500_security_remove_legacy_announcement_delivery_policy.sql` — commit `6ed18dc595c46ca911f2c968da79bd6bcaa9e1f6`.

### Verificación
Se volvió a consultar RLS después de aplicar los cambios y se confirmó que las políticas nuevas contienen la comprobación de usuario activo. El Security Advisor no añadió una nueva alerta por estas reparaciones.

### Pendientes de seguridad que siguen abiertos
1. `propiedades_publicas` continúa como SECURITY DEFINER view. Es intencional en la arquitectura actual, pero requiere rediseño si queremos eliminar el ERROR del Advisor sin abrir SELECT directo sobre `propiedades`.
2. `pg_net` continúa instalado en `public`; su migración debe hacerse con cuidado porque el scheduler/comunicaciones puede depender de él.
3. Las funciones administrativas SECURITY DEFINER siguen apareciendo como WARN porque deben ser invocables desde el panel autenticado; se mantienen protegidas por comprobación administrativa interna.
4. La protección de contraseñas filtradas de Supabase sigue desactivada. Supabase recomienda habilitarla desde la configuración de Auth; esta opción no es una migración SQL del esquema.
5. Falta una prueba E2E con un usuario real en estado suspendido para comprobar también la experiencia de sesión/redirect en el cliente, además de la barrera RLS ya verificada en base de datos.

## 28. Estado de la sección de seguridad

La revisión de RLS de perfiles, favoritos, solicitudes, notificaciones y entregas de anuncios queda **cerrada para esta etapa**. No se considera cerrada toda la seguridad del proyecto todavía por los cuatro pendientes del apartado anterior.

El siguiente bloque recomendado antes de pasar a otra sección es resolver la frontera de `propiedades_publicas` y revisar la migración segura de `pg_net`. Después de eso podemos pasar a la siguiente sección funcional sin dejar pendiente esta auditoría.


## 29. Eliminación del ERROR de SECURITY DEFINER de propiedades públicas — 2026-09-22

Se reemplazó la vista `public.propiedades_publicas` que estaba marcada por Security Advisor como SECURITY DEFINER.

### Nueva arquitectura
- Se creó una tabla pública de solo lectura con únicamente las columnas que exponía la vista anterior: `public.propiedades_publicas`.
- La tabla tiene RLS activo y una política exclusiva de SELECT para `anon` y `authenticated`.
- No se concedieron INSERT, UPDATE ni DELETE a los roles de aplicación.
- Se hizo una carga inicial y se comprobó que existen **9 propiedades activas en la tabla base y 9 en la tabla pública**.
- Un trigger sobre `propiedades` mantiene sincronizada la tabla pública en INSERT/UPDATE/DELETE.
- La función de sincronización está en el esquema `private`, es SECURITY DEFINER sólo para ejecutar la sincronización interna y no tiene EXECUTE para `public`, `anon` ni `authenticated`.
- La app sigue utilizando el mismo nombre `propiedades_publicas`, por lo que no necesita una ruta alternativa ni acceso directo a `propiedades`.
- El feed `propiedades_cambios` continúa provocando la recarga de la app después de cambios administrativos.

### Resultado
El ERROR de Security Advisor relacionado con `propiedades_publicas` dejó de aparecer. El límite público queda ahora en una tabla dedicada, en lugar de depender de una vista SECURITY DEFINER.

### pg_net
Se investigó el WARN de `pg_net` instalado en `public`. El proyecto usa actualmente `net.http_post` desde el job `eyesite-process-communications` cada minuto para llamar al scheduler de comunicaciones. Se intentó preparar una migración para mover la extensión a `extensions`, pero PostgreSQL/Supabase respondió que la extensión `pg_net` no soporta `ALTER EXTENSION ... SET SCHEMA`. **No se modificó la configuración real de pg_net** y la migración no aplicada fue eliminada de GitHub.

Por seguridad, el WARN de pg_net queda abierto y documentado en lugar de intentar un workaround que pueda romper el scheduler.

### Estado actualizado
La lista de seguridad queda ahora reducida a:
1. `pg_net` en schema `public` — pendiente por limitación de la extensión y dependencia del scheduler.
2. RPC administrativas SECURITY DEFINER ejecutables por `authenticated` — intencionales y protegidas por comprobación administrativa.
3. Protección contra contraseñas filtradas de Auth — pendiente de configuración desde Supabase Auth.

El ERROR de `propiedades_publicas` quedó resuelto.
