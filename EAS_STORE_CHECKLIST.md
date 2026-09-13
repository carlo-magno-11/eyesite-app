# EYESITE — Checklist de publicación Android + iOS

## Antes de enviar a revisión

- [ ] Producción conectada a Supabase real y accesible.
- [ ] Cuenta de demostración para App Review, con instrucciones claras.
- [ ] No usar enlaces de preview de Manus en la app publicada.
- [ ] Política de privacidad publicada en una URL pública y añadida en App Store Connect / Play Console.
- [ ] Eliminación de cuenta disponible dentro de la app.
- [ ] Descripción de uso de ubicación clara y permiso solo cuando se usa la función.
- [ ] Si se deniega ubicación, el usuario conserva una alternativa manual.
- [ ] Fotos/videos se solicitan solo cuando el usuario intenta seleccionar contenido.
- [ ] No hay claves service_role ni secretos en el cliente.
- [ ] Revisar permisos Android/iOS y justificar cada uno.
- [ ] Probar login, registro, recuperación de contraseña, cierre de sesión y eliminación de cuenta.
- [ ] Probar publicación, revisión, aprobación y rechazo de propiedades.
- [ ] Probar mapa sin permiso de ubicación.
- [ ] Probar mapa con ubicación.
- [ ] Probar favoritos y notificaciones.
- [ ] Probar estados pendiente/rechazado/activo.
- [ ] Probar en dispositivo físico Android y iPhone.
- [ ] Verificar crash-free y navegación sin pantallas vacías.

## EAS Update

`runtimeVersion` usa `appVersion`. Esto permite publicar updates JS compatibles sobre el mismo binario.

OTA apropiado: UI, estilos, textos, validaciones y correcciones JS compatibles.

Nuevo build: permisos, módulos nativos, Expo SDK/React Native, configuración nativa o cualquier cambio incompatible con el runtime.

Nunca usar OTA para ocultar una funcionalidad prohibida o para eludir las reglas de App Review/Google Play.
