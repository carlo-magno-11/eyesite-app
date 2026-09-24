# Realtime lifecycle hardening — 2026-09-24

## Problem observed

Android and Web reproduced:

`cannot add postgres_changes callbacks ... after subscribe()`

The error was observed in the profile Realtime channel and previously in the user notifications channel.

## Root cause addressed

The channel lifecycle could overlap during authentication/session initialization or component remounts. A previous channel with the same topic could still be in the process of being removed while a new lifecycle attempted to configure the same topic.

The handlers were already placed before `.subscribe()`; this change additionally isolates each lifecycle with a unique channel instance name.

## Changes

- `hooks/useAuth.tsx`
  - Added a monotonic channel-generation counter.
  - Profile channels now use `profile-{uid}-{generation}`.
  - Existing cleanup and UID guard remain in place.
- `hooks/use-notifications.ts`
  - Added a monotonic channel-generation counter.
  - Notification channels now use `user-notifications-{uid}-{generation}`.
  - Existing cleanup, AppState reload, and fallback loading remain unchanged.

## Safety

- No database schema changes.
- No Supabase permissions changed.
- No property-query changes.
- `propiedades_publicas` remains untouched.
- `main` remains untouched.
- Changes are isolated on `fix/realtime-lifecycle-android-ios`.

## Validation required before APK

Run locally from the branch:

```bash
pnpm install --frozen-lockfile
pnpm run check
pnpm run test
pnpm lint
npx expo-doctor
npx expo start -c
```

Then verify Android and Web startup, profile updates, notifications, navigation, and the previously missing section. Only after those checks pass should a new preview APK be generated.


## Follow-up: protected notification request

The browser log showed HTTP 401 for `notificaciones`. Public property reads still succeeded, so this is consistent with the protected notification request being made with an unavailable/expired session rather than a property-data failure.

`useNotifications.load()` now obtains the current Supabase session before querying `notificaciones`. Supabase can refresh a persisted session through `getSession()`; if there is no matching authenticated session, the hook stops before issuing the protected query and exposes a session error instead of repeatedly producing a 401.

This does not weaken RLS or make notifications public.


## Follow-up: Web map viewport

The Web map was reviewed separately from the Realtime issue. The Leaflet map itself was already configured at 100% width/height, but the outer React Native container relied entirely on `flex: 1` while also sharing the page with the header, radius controls and results list. On Web this could leave the WebView visually short.

Change on `app/(tabs)/map.tsx`:
- Added `useWindowDimensions()` to measure the browser viewport.
- Web now gives the map a responsive explicit height: 68% of viewport height, clamped between 520px and 760px.
- Native iOS/Android keeps the existing flex-based behavior.
- No Google Maps or Google Cloud dependency was introduced.
- The map data source and `propiedades_publicas` flow were not changed.


## 2026-09-24 — mapa: exploración libre de Yucatán

- El mapa inicia con una vista amplia de Yucatán.
- Se eliminó el filtro por radio de 10/25/50/100 km.
- Las propiedades activas con coordenadas válidas ya no se descartan por distancia.
- El usuario controla manualmente zoom y desplazamiento para explorar la zona que le interese.
- Se eliminó el ajuste automático `fitBounds` de todos los marcadores, que podía mover la cámara lejos de la vista inicial.
- La distancia a la ubicación del usuario se conserva únicamente como información/ordenamiento cuando existe ubicación disponible; no funciona como límite de búsqueda.
- Se mantuvo la implementación Leaflet/OpenStreetMap + WebView, sin Google Cloud.
- Commit: `2ec04cbf313a5c9f48636841e06b44210b32c72a`.


## Revisión de retrocompatibilidad y capa visual — 2026-09-24

Esta etapa se realizó sobre `fix/realtime-lifecycle-android-ios` sin tocar `main` y sin generar un nuevo APK.

### Compatibilidad multiplataforma revisada
- Se mantuvo el mismo stack Expo/React Native/React Native Web y no se cambió el contrato de Supabase.
- Se conservaron los puntos específicos por plataforma existentes: `expo-location` nativo frente a `navigator.geolocation` en Web, notificaciones push deshabilitadas en Web y WebView/Leaflet para el mapa.
- Se corrigió la animación del fondo de autenticación para que Web no solicite `useNativeDriver`; iOS/Android conservan el driver nativo.
- Se revisó la navegación de tabs sin volver a mostrar Propiedades en la barra inferior, porque su acceso actual desde Inicio es intencional.
- Se mantuvieron Bundle ID, scheme, EAS project ID, Privacy Manifest, runtimeVersion y configuración de plataformas existentes.
- Se mantuvo el objetivo sin Google Cloud: mapa Leaflet/OpenStreetMap y ubicación mediante APIs de la plataforma.

### Primera etapa visual aplicada
- Se probó una capa de tokens compartidos, pero se retiró de esta rama para mantener el tipado Expo/TypeScript estable; la paleta visual se mantiene mediante estilos locales deliberados.
- Se refinó Inicio: jerarquía de encabezado, botones de cuenta/notificaciones, hero con overlay oscuro, categorías en tarjetas y ajustes de espaciado; se evitó añadir dependencias visuales nuevas.
- Se refinó Oportunidades y PropertyCard con superficies y bordes de mayor profundidad visual, manteniendo la identidad negro/dorado.
- Se refinó Mapa: vista inicial amplia de Yucatán, zoom inicial 8 y controles con la misma gama visual, manteniendo Leaflet/OpenStreetMap.
- Se refinó Comunicación/Notificaciones, Mi cuenta, Mis terrenos, Mis solicitudes y Configuración con la misma capa visual.
- Se refinó Login/Registro conservando validaciones, flujo de Supabase y aceptación legal.

### Regla de seguridad de esta etapa
No se modificó lógica de autorización, RPCs administrativos, esquema Supabase ni flujo de publicación para conseguir cambios visuales. La prioridad es evitar regresiones funcionales mientras se mejora la presentación.

### Pendiente antes de APK
Esta etapa visual todavía requiere validación local en Web y Android, seguida de iOS/Expo según disponibilidad. El APK no debe regenerarse hasta cerrar la validación de Realtime y navegación indicada en este documento.

### Validación CI de la capa visual
- En el último ciclo de GitHub Actions, TypeScript, lint, tests y la configuración nativa iOS avanzaron correctamente; el Web export estaba ejecutándose al cierre de esta revisión.
- Se detectó y corrigió una regresión de tipado causada por reemplazos automáticos de tokens de color (por ejemplo, sufijos `Soft`/`Elevated` pegados a literales). Se eliminó esa estrategia para no introducir cambios ciegos.
