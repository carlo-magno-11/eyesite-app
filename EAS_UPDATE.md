# EYESITE — EAS Update / Android + iOS

EYESITE usa EAS Update para publicar pequeñas actualizaciones OTA de la capa JavaScript/estilos/assets sin reconstruir el binario, siempre que el cambio sea compatible con el runtime nativo ya instalado.

## Primera configuración

1. Instalar dependencias:
   `pnpm install`
2. Instalar/configurar EAS CLI:
   `npm i -g eas-cli`
3. Iniciar sesión:
   `eas login`
4. Vincular el proyecto EAS:
   `eas init`
5. Configurar EAS Update:
   `eas update:configure`

Ese último comando agregará el `updates.url` y `extra.eas.projectId` reales del proyecto. No inventar ni compartir el projectId.

## Primera publicación en tiendas

Crear los binarios de producción después de configurar EAS Update:

- `eas build --platform android --profile production`
- `eas build --platform ios --profile production`

Probar primero con `preview`/TestFlight y después enviar a Google Play / App Store.

## Actualización pequeña OTA

Para cambios que no requieren código nativo:

`eas update --channel production --message "Descripción del cambio"`

Los usuarios no necesitan reinstalar la aplicación. El update se descarga y se aplica según la configuración de expo-updates, normalmente al siguiente arranque/reload.

## Cambios que SÍ requieren nueva versión de tienda

Crear un nuevo build y volver a pasar por la distribución correspondiente cuando se cambie, por ejemplo:

- permisos nativos
- SDK de Expo / React Native
- módulos nativos
- configuración nativa de iOS/Android
- capacidades de Apple
- configuración que cambie el binario
- cualquier cambio incompatible con el runtime instalado

## Regla importante para App Store

EAS Update no es un mecanismo para eludir las reglas de Apple o Google. Las actualizaciones OTA deben seguir las políticas de las tiendas. La ventaja es que las correcciones pequeñas y cambios compatibles con el binario pueden distribuirse sin una nueva compilación/revisión de cada build.

## Estrategia EYESITE

- `preview`: pruebas internas antes de producción.
- `production`: usuarios reales.
- Mantener `runtimeVersion` por versión nativa.
- No subir una OTA que dependa de una API/módulo nativo ausente.
- Si una OTA falla, publicar una reversión compatible con el mismo runtime.
