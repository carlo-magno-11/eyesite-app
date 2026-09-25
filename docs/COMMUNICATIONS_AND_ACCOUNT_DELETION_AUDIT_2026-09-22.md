# EYESITE — Auditoría de notificaciones, anuncios y eliminación de cuenta — 2026-09-22

## Estado actual

- Hay 29 notificaciones en producción y todas tienen estado_envio='sent'.
- Las 29 tienen push_status='not_configured'. Esto se explica por la ausencia actual de Expo Push Tokens en los 9 perfiles; no demuestra un fallo del envío de Expo.
- Los 9 perfiles actuales tienen preferencias push e in-app habilitadas por defecto y ninguno tiene token registrado.
- No hay anuncios activos/publicados actualmente.
- El panel administrativo ya permite crear notificaciones y anuncios, programarlos, gestionar imágenes y registrar eventos de apertura/click.
- La app tiene pestañas separadas de Notificaciones y Anuncios, filtros de no leídas, marcar todas como leídas y preferencias de push/in-app/anuncios.
- El Edge Function send-notification está activo con JWT obligatorio y valida que el emisor sea administrador activo.
- El Edge Function delete-account valida manualmente el Bearer token antes de usar service role y distingue contenido inmobiliario enviado personalmente de propiedades de catálogo creadas por EYESITE.

## Push

La prueba pendiente es física: instalar una build nativa, conceder permiso de notificaciones, registrar Expo Push Token y ejecutar un envío real desde el panel. Expo Go no es una prueba válida para push remoto Android según la propia lógica de la app.

## Anuncios

La política pública exige simultáneamente activa, publicado, programada_para <= now() y no expirado. Los administradores conservan acceso. Esto evita exponer anuncios aún no publicados o expirados.

## Eliminación de cuenta

El flujo existe desde Mi Cuenta. El backend elimina la cuenta Auth y datos personales asociados, elimina contenido inmobiliario enviado personalmente y conserva propiedades de catálogo de EYESITE, desvinculándolas del usuario cuando corresponde.

## Pendientes antes de producción

1. Probar push real en dispositivo físico.
2. Crear un anuncio de prueba con programación/expiración y verificar visibilidad antes/después de cada estado.
3. Probar eliminación con un usuario de prueba que tenga favorito, solicitud y propiedad enviada.
4. Verificar públicamente la URL final del aviso de privacidad antes de App Store Connect.
5. Confirmar que el correo de contacto de privacidad publicado sea el definitivo de EYESITE.
