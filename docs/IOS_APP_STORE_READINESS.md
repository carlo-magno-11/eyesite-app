# EYESITE — Auditoría de preparación iOS / App Store

Fecha: 2026-09-22

## Estado de esta auditoría

Este documento registra hallazgos verificados desde GitHub. No representa una aprobación de App Store ni sustituye una compilación real firmada.

### Verificado

- TypeScript y ESLint: el workflow de GitHub Actions `EYESITE checks` completó correctamente en la rama `audit/remove-unused-maps-ios`.
- Prebuild iOS + validación básica de `PrivacyInfo.xcprivacy`: el workflow incluye y ejecuta estas comprobaciones.
- El proyecto usa Expo SDK 57, React Native 0.86.3 y EAS.
- La identidad iOS configurada es `com.eyesite.app`.
- La app usa Leaflet + OpenStreetMap dentro de WebView para el mapa. No se encontró código de uso de `react-native-maps`.
- Se eliminó `react-native-maps` como dependencia directa en una rama aislada. El lockfile también dejó de declararlo como dependencia del proyecto.
- No se modificó Supabase ni datos de producción como parte de esta limpieza.

### Pendientes antes de producción

1. Compilación EAS de producción para verificar el binario iOS real.
2. Revisión del Privacy Report del binario final, incluyendo los SDK nativos agregados por Expo.
3. Pruebas en iPhone físico: registro, verificación de correo, sesión, propiedades, favoritos, solicitudes, mapa/ubicación, notificaciones push, anuncios, reproducción de video y eliminación de cuenta.
4. Publicar el aviso de privacidad en una URL HTTPS pública y estable para App Store Connect. El repositorio contiene `public/privacy.html`, pero la existencia del archivo no demuestra que exista una URL pública desplegada.
5. Confirmar configuración de App Store Connect, identificador de bundle, firma/certificados y capacidades de notificaciones.
6. Revisar permisos y textos de privacidad contra el comportamiento final del binario.

## Mapa

La implementación actual de `app/(tabs)/map.tsx` utiliza:

- `expo-location` para ubicación en iOS/Android.
- `react-native-webview` para mostrar Leaflet.
- Leaflet 1.9.4.
- OpenStreetMap como proveedor de teselas.
- La vista pública de propiedades mediante el hook de propiedades.
- Navegación a la ficha al seleccionar un marcador.

No se requiere Google Maps ni Google Cloud para esta arquitectura.

## Privacidad

La app contiene:

- `app/privacy.tsx`: aviso dentro de la aplicación.
- `public/privacy.html`: versión HTML destinada a publicación web.

El aviso declara uso de ubicación, fotos/videos/archivos, Supabase, servicios de mapas y Sentry. Antes de publicar debe comprobarse que estas declaraciones coincidan exactamente con el binario y con los servicios realmente desplegados.

## Notificaciones

La app tiene:

- pantalla de notificaciones con pestañas de notificaciones y anuncios;
- preferencias para notificaciones internas, push y anuncios push;
- registro de token Expo Push;
- enlaces/eventos de anuncios;
- marcado individual y masivo como leído.

Debe hacerse una prueba física de extremo a extremo con un dispositivo iOS real y un proyecto EAS de producción.

## Regla de integración

Ningún cambio de esta auditoría debe fusionarse a `main` hasta que pase el CI correspondiente y se revise el resultado en un dispositivo iOS físico cuando el cambio afecte el binario.

## Rama de documentación

Esta documentación se mantiene inicialmente aislada de `main` para conservar un historial auditable.
