# EYESITE — notas de liberación

## Identidad
- Bundle ID actual: `com.eyesite.app`
- Deep-link scheme: `eyesite`
- Antes del primer build, comprobar que `com.eyesite.app` está disponible en Apple Developer y Google Play/EAS.

## EAS Update
- `runtimeVersion.policy = appVersion`
- `preview` y `production` usan canales separados.
- Los cambios nativos requieren un nuevo build. Los cambios compatibles de JS/UI/assets pueden publicarse por EAS Update.
- Antes de publicar a producción: probar en `preview` y después promover el mismo update.

## EAS Project ID
El `extra.eas.projectId` y `updates.url` no se inventan. Deben ser generados por `eas update:configure`/EAS cuando el propietario vincule el proyecto.

## Privacidad
La política local está en `public/privacy.html`. Para App Store Connect se necesita una URL HTTPS pública y estable que apunte a esa política.

## App Store
- Preparar una cuenta demo funcional para revisión si la app requiere login.
- Declarar correctamente los datos recopilados en App Privacy.
- Verificar eliminación de cuenta dentro de la app.
