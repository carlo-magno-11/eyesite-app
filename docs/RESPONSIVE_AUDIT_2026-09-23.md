# EYESITE — Auditoría responsive web

Fecha: 2026-09-23
Rama: `fix/responsive-layout-web`
Base: `release/eyesite-definitive`

## Objetivo

Adaptar la interfaz web de EYESITE a teléfono, tablet, laptop y monitor grande sin cambiar la lógica de Supabase, autenticación, propiedades, favoritos, notificaciones, mapa ni seguridad.

## Cambios realizados

### 1. Capa responsive compartida
Se creó `hooks/use-responsive.ts` usando `useWindowDimensions()` para que el navegador reaccione al redimensionamiento sin depender de un ancho calculado una sola vez.

Breakpoints utilizados:
- < 600 px: teléfono / una columna.
- 600–1023 px: tablet / dos columnas.
- 1024–1439 px: escritorio / tres columnas.
- >= 1440 px: escritorio grande / cuatro columnas.

También centraliza el padding horizontal y el ancho máximo del contenido.

### 2. Oportunidades
`app/(tabs)/properties.tsx` ahora cambia la lista de propiedades a una cuadrícula responsive y mantiene una sola columna en teléfonos. En escritorio el contenido queda centrado para evitar tarjetas excesivamente anchas.

### 3. Inicio
`app/(tabs)/index.tsx` ahora limita el ancho del contenido en pantallas grandes y ajusta la altura del hero. El texto principal también escala moderadamente en escritorio.

### 4. Detalle de propiedad
`app/property/[id].tsx` dejó de usar `Dimensions.get('window')` estático. Usa `useWindowDimensions()`, limita el contenido multimedia a 1200 px y el modal de video a un ancho máximo de 1000 px. Esto permite que el detalle responda al cambio de tamaño del navegador.

### 5. Autenticación
Login y registro centran el formulario y aplican un ancho máximo en escritorio, manteniendo el comportamiento flexible de móvil y teclado.

## Lo que deliberadamente NO se modificó

- Supabase y consultas de datos.
- Auth / recuperación de contraseña.
- RPCs administrativos y límites de seguridad.
- Notificaciones y push.
- Mapa y ruta sin Google Cloud.
- Flujo de aprobación de propiedades.
- Lógica de favoritos.
- Modelo de datos.
- Navegación funcional.

## Validación pendiente

La validación final debe incluir:
1. TypeScript/lint del branch.
2. GitHub Actions de los commits nuevos.
3. Export web.
4. Prueba manual en Safari/Chrome con 375, 430, 768, 1024, 1280 y 1440+ px.
5. Prueba iOS física después de confirmar que el cambio responsive no introdujo errores nativos.

Esta rama no debe fusionarse a `main` hasta cerrar esas comprobaciones.


## 2026-09-24 — revisión funcional posterior

Durante la revisión de las pantallas de cuenta se detectó una pérdida de datos de UI: `mi-cuenta.tsx` consume `ciudad` y `presupuesto` desde `useAuth`, pero el hook no los seleccionaba desde `profiles`. La base de datos sí contiene ambas columnas como `text`. Se corrigió `hooks/useAuth.tsx` para incluir `ciudad` y `presupuesto` en la consulta del perfil. No se modificó la lógica de autorización, estado de aprobación ni los permisos de usuario.

La corrección está aislada en `fix/profile-fields-sync`, basada en `fix/responsive-layout-web`; `main` permanece sin cambios. Debe pasar TypeScript/CI antes de integrarse.


## 2026-09-24 — Sincronización de aprobación de cuenta
- Se detectó que `useAuth` solo cargaba `profiles` durante `getSession` y cambios de autenticación.
- La aprobación administrativa puede modificar `profiles.estado` mientras el usuario permanece dentro de la app; sin una nueva sesión, el cliente podía quedarse en `/pending` hasta recargar o cambiar de estado de autenticación.
- Se añadió una suscripción Realtime específica al registro de `profiles` del usuario autenticado. Cuando cambia el perfil, se vuelve a cargar el perfil y `AuthGate` puede reaccionar al nuevo `estado`.
- También se tiparon `ciudad` y `presupuesto` en `AuthProfile`, manteniendo la consulta existente.
- No se cambió la lógica de aprobación administrativa ni se concedió ningún permiso adicional al cliente.
- Pendiente de validación: CI del commit actual y prueba real de aprobación desde el panel mientras un usuario permanece en la pantalla de espera.

## 2026-09-24 — Corrección de CI y frontend de Mi Cuenta
- El workflow de GitHub para el commit anterior del branch falló en la etapa TypeScript.
- La inspección del archivo `app/mi-cuenta.tsx` encontró un defecto de sintaxis real: había secuencias literales `\\n` dentro del objeto de `StyleSheet.create`, además de imports/variables que podían quedar sin uso.
- Se reemplazó la pantalla por una versión limpia y responsive que sí utiliza `useResponsive` e iconos de Ionicons.
- Se conservaron las operaciones existentes de guardar perfil, cerrar sesión y eliminación de cuenta; no se cambiaron permisos ni lógica de Supabase.
- El nuevo commit correctivo es `e8220cc4e1cea218f6998616c8fe7f0ce9dec2c3`.
- Pendiente: nueva ejecución de GitHub Actions para confirmar TypeScript/lint del commit correctivo.


## 2026-09-24 — CI posterior a la corrección
- El workflow `EYESITE checks` #186 ejecutado sobre el commit `03d85a72dd8ed644bfa316439785ab0a4c70a5bc` terminó en **SUCCESS**.
- `native-config`: SUCCESS, incluyendo generación del proyecto iOS y validación del Privacy Manifest.
- `quality`: SUCCESS, incluyendo TypeScript y lint.
- Esto valida el estado del commit documentado; todavía no sustituye las pruebas físicas de iPhone/Android ni las pruebas funcionales reales de correo, push y aprobación.

## 2026-09-24 — Flujo de medios de solicitudes revisado
- La publicación del usuario sube medios primero a `eyesite-staging`, bucket privado.
- El panel administrativo llama a `promote-submission-media` antes de aprobar una solicitud.
- La Edge Function valida administrador, propietario del archivo, ruta, MIME y tamaño; después copia el medio a `eyesite-media` y verifica el destino.
- Solo después de una promoción completa, `admin_approve_property_request` recibe las URLs públicas definitivas.
- La aplicación normaliza y consume medios desde `eyesite-media`; las referencias a `eyesite-staging`/`eyesite-private` se rechazan deliberadamente.
- La Edge Function está activa en producción (versión 3). Por tanto, el flujo de medios no debe modificarse a ciegas; la siguiente validación necesaria es una publicación real con foto y otra con video, seguida de aprobación desde el panel y comprobación en iOS/Web.


## 2026-09-24 — Paridad web y corrección de Realtime

### Error observado en navegador
Se detectó:
`cannot add \`postgres_changes\` callbacks ... after \`subscribe()\``.

La causa estaba en `useAuth`: durante el arranque, `getSession()` y `onAuthStateChange()` podían entrar casi al mismo tiempo y crear/reemplazar el mismo canal de perfil mientras la suscripción Realtime todavía estaba en proceso. Supabase requiere registrar los callbacks `postgres_changes` antes de `subscribe()`; añadirlos después de que el canal haya entrado genera el error.

Se corrigió el ciclo de vida del canal:
- un solo canal por UID;
- se evita crear una segunda suscripción si ya existe;
- el callback se registra antes de `subscribe()`;
- ante `CHANNEL_ERROR`, `TIMED_OUT` o `CLOSED` se conserva la carga REST del perfil como respaldo;
- se mantiene Realtime para detectar aprobación/cambios de perfil sin recargar.

### Paridad de funciones en Web
Se detectó que el mapa estaba deliberadamente deshabilitado en Web porque `react-native-webview` es un componente para vistas nativas. En lugar de quitar la función, se creó un adaptador multiplataforma:
- `components/leaflet-map.tsx`: WebView para iOS/Android.
- `components/leaflet-map.web.tsx`: iframe con `srcDoc` para navegador.
- El mismo HTML Leaflet/OpenStreetMap y la misma navegación de propiedades se reutilizan.
- El navegador usa `navigator.geolocation` al pulsar ubicación; iOS/Android continúan usando `expo-location`.
- Se conserva la ruta sin Google Cloud.

Expo documenta que las diferencias de plataforma deben resolverse mediante módulos específicos y que WebView es una API nativa; también permite componentes web específicos.

### Notificaciones
Se eliminó el registro del listener de respuesta de `expo-notifications` en Web para quitar el warning de API nativa. El centro de notificaciones in-app continúa funcionando mediante Supabase Realtime en Web. El push remoto seguirá siendo una capacidad de dispositivo; no se finge soporte web donde la API instalada no lo proporciona.

### Tarjetas de propiedades
Se estabilizó la tarjeta:
- ancho 100% del elemento de cuadrícula;
- imagen con relación 16:10 en lugar de una altura fija que se veía diferente según columna;
- contenido con altura mínima;
- título con espacio reservado para dos líneas;
- fila de precio/superficie con altura estable.

Esto evita que propiedades con títulos o ubicaciones de distinta longitud deformen la cuadrícula. La cuadrícula existente mantiene 1/2/3/4 columnas según ancho de pantalla.

### Validación pendiente de esta rama
- `pnpm run check`
- `pnpm run lint`
- `pnpm test`
- `pnpm run build:web`
- prueba visual Safari/Chrome en 375/430/768/1024/1280/1440+ px;
- prueba de mapa web y geolocalización tras dar permiso al navegador;
- prueba iOS/Android del mismo mapa;
- confirmar que no reaparece el error Realtime en el navegador.


## 2026-09-24 — Segunda pasada visual Web

Se revisaron las pantallas principales para evitar que el tamaño del navegador cambie de forma desproporcionada la interfaz.

También se eliminó del login el uso directo de las propiedades `shadowColor/shadowOffset/shadowOpacity/shadowRadius`, sustituyéndolas por `boxShadow` para el estilo Web moderno, manteniendo `elevation` para las plataformas nativas.

Se verificó además que las rutas utilizadas desde Mi cuenta existan en el proyecto: configuración, nosotros, mis propiedades, mis solicitudes y notificaciones.

La validación final de esta segunda pasada continúa pendiente de CI y export Web; no se considera terminada hasta comprobar TypeScript, lint, tests y bundle Web.


## 2026-09-24 — Listas de cuenta adaptadas a Web

Se adaptaron Favoritos, Mis terrenos y Mis solicitudes al mismo sistema responsive de propiedades: una columna en teléfono y columnas múltiples en pantallas amplias cuando corresponde. Mis terrenos y Mis solicitudes ahora usan un contenedor máximo centrado y el mismo espaciado lateral que el resto de la aplicación.

Se conservó la lógica Supabase existente; estos cambios son de presentación y distribución, sin ampliar permisos ni modificar RLS.
