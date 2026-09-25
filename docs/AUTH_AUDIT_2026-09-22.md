# EYESITE — Auditoría de autenticación y ciclo de acceso — 2026-09-22

## Hallazgos verificados

- El trigger handle_new_user() crea automáticamente el perfil con role='user' y estado/status pendiente.
- admin_approve_profile(uuid) exige administrador y correo verificado antes de activar el perfil.
- Se detectó que la aprobación no generaba la notificación prometida al usuario.
- Se preparó y aplicó en producción una corrección idempotente para crear la notificación profile-approved:<user_id> al pasar a activa.
- La lectura de notificaciones permanece limitada por RLS al propio usuario (o administrador).
- La verificación de correo y el reenvío tenían redirects diferentes en móvil; PR #3 normaliza el flujo.
- La recuperación de contraseña no tenía pantalla final para establecer la nueva contraseña; PR #9 la completa.
- El PR #9 pasó TypeScript, ESLint, configuración nativa iOS y validación de Privacy Manifest mediante GitHub Actions.
- No se hicieron cambios destructivos ni se tocó main.

## Flujo objetivo

Registro → verificación de correo → creación/completado de perfil → aceptación de términos → aprobación administrativa → notificación de aprobación → acceso activo → registro de Push Token.

## Pendientes de prueba física

1. Registrar un usuario de prueba.
2. Abrir el correo de confirmación en iPhone.
3. Completar perfil y términos.
4. Aprobar desde el panel.
5. Confirmar notificación in-app.
6. Confirmar push si el dispositivo concedió permiso.
7. Probar recuperación de contraseña de extremo a extremo.

## Seguridad pendiente

Supabase Security Advisor todavía reporta auth_leaked_password_protection deshabilitado. Debe habilitarse desde la configuración de Auth de Supabase antes del cierre de producción. No se cambió automáticamente porque el conector disponible no expone esa configuración como una operación segura de actualización.
