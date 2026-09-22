# EYESITE iOS Release Candidate — 2026-09-22

## Estado
- Rama: `release/ios-1.0.0`
- PR: #17
- `main`: intacta, sin merge
- CI #151: SUCCESS
- `quality`: TypeScript + ESLint SUCCESS
- `native-config`: Expo iOS prebuild + Privacy Manifest SUCCESS

## Cambios funcionales consolidados
- Auth: registro, verificación/resend, recovery callback y cambio de contraseña.
- Propiedades: sincronización correcta de `propiedades` hacia `propiedades_publicas`.
- Comunicaciones: visibilidad pública de anuncios restringida a contenido publicado/vigente.
- Cuentas: aprobación administrativa notifica al usuario de forma idempotente.
- iOS: eliminación de dependencia no utilizada `react-native-maps`; mapa mantiene Leaflet/OpenStreetMap + WebView, sin Google Cloud.

## Validaciones pendientes antes de App Store
1. Ejecutar en Mac: `pnpm install --frozen-lockfile`, `pnpm run check`, `pnpm run lint`, `npx expo-doctor`.
2. Cambiar VS Code a esta rama.
3. Verificar URL pública del aviso de privacidad.
4. Probar físicamente iPhone: registro/verificación, recovery, login, propiedades, mapa, notificaciones, multimedia y eliminación de cuenta.
5. Configurar/confirmar credenciales Apple y ejecutar EAS production build.
6. Probar el binario generado antes de cualquier submission.

## Regla de release
No hacer merge a `main` ni submission a App Store hasta que las pruebas locales y físicas estén completas.
