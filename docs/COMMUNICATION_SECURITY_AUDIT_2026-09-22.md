# EYESITE — Auditoría de comunicación y seguridad — 2026-09-22

## Notificaciones

La app filtra las notificaciones por usuario autenticado y solo muestra registros con `estado_envio='sent'` y fecha programada ya alcanzada.

Los RPC de lectura:
- `marcar_notificacion_leida` solo modifica una notificación cuyo `user_id = auth.uid()`.
- `marcar_todas_notificaciones_leidas` solo modifica las del usuario actual.
- `registrar_anuncio_evento` solo registra eventos para el usuario autenticado y limita los eventos a `opened`/ `clicked`.

## Anuncios

La app aplica estado publicado, activo, programación y expiración. La política pública de producción también exige esas mismas condiciones, por lo que la protección no depende únicamente del cliente.

El panel administrativo tiene una sección de COMUNICACIÓN que permite notificaciones o anuncios, imágenes, galería, enlaces, prioridad, expiración y programación.

## Push

El proyecto utiliza Expo Push Notifications y EAS; no requiere Google Cloud. En producción actual, las notificaciones existentes muestran `push_status='not_configured'`, lo que es compatible con usuarios sin token Expo registrado. Esto no significa que el sistema de push esté roto: requiere una instalación nativa con permisos concedidos y token válido.

## Hallazgo de seguridad pendiente

El Security Advisor de Supabase sigue reportando:
- `pg_net` instalado en el schema `public`.
- 19 funciones `SECURITY DEFINER` ejecutables por `authenticated`. Las funciones administrativas inspeccionadas contienen controles `is_admin()`; los RPC de usuario inspeccionados restringen las operaciones mediante `auth.uid()`.
- **Leaked Password Protection deshabilitado**. Este último sí requiere una acción de configuración de Auth; no se cambió automáticamente para evitar alterar la configuración de producción sin una verificación explícita.

## Estado

No se modifica `main` con este checkpoint. Las correcciones funcionales continúan separadas en PRs.
