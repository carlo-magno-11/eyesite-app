# EYESITE — Auditoría de comunicación y propiedades (2026-09-22)

## Resultado

- Producción contiene 9 propiedades activas; 9 están en `propiedades_publicas`.
- 3 de las 9 propiedades tienen coordenadas; son las únicas que pueden aparecer como marcadores del mapa.
- La app consulta `propiedades_publicas`, nunca `propiedades` directamente para el catálogo público.
- La app escucha `propiedades_cambios` para refrescar el catálogo después de cambios administrativos.
- Hay 29 notificaciones existentes y 0 anuncios publicados/almacenados al momento de esta auditoría.
- El flujo push usa Expo Push y no requiere Google Cloud.
- El reenvío de verificación de correo fue alineado entre registro y reenvío mediante PR #3.

## Seguridad aplicada

Se endureció en Supabase la política de lectura pública de `anuncios`. Un anuncio solo es visible públicamente cuando:

1. está activo;
2. está en estado `publicado`;
3. su fecha de programación ya llegó;
4. no está expirado.

Los administradores conservan acceso.

La migración correspondiente está en `supabase/migrations/20260922190000_security_public_announcements_visibility.sql` y se aplicó en producción sin borrar datos.

## Próximos controles

- Validar físicamente registro/reenvío de correo en iPhone y web.
- Probar que una edición de propiedad administrativa actualiza inmediatamente el catálogo y detalle.
- Probar publicación, programación y expiración de un anuncio de extremo a extremo.
- Probar push en build nativa (no Expo Go).
- Verificar la URL pública final de privacidad y realizar build EAS de producción.

## Protección de main

Este documento es un checkpoint de auditoría. No implica merge automático a `main`.
