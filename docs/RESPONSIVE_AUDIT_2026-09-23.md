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
