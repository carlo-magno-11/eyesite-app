# EYESITE — App Store Review Hardening — 2026-09-25

## Cambio aplicado

Se ajustó `app/_layout.tsx` en la rama aislada `fix/eyesite-platform-security-20260925` para permitir navegación sin sesión a las superficies de descubrimiento público:

- inicio;
- catálogo de propiedades;
- mapa;
- detalle de propiedad;
- Nosotros;
- aviso de privacidad.

Las acciones que dependen de cuenta continúan protegidas por autenticación y por el estado de aprobación del perfil.

## Motivo

La guía vigente de Apple indica que, cuando una app no tiene una funcionalidad principal que dependa de una cuenta, debe ofrecer acceso sin iniciar sesión. EYESITE tiene una función principal de descubrimiento de propiedades que puede funcionar con datos públicos.

Fuente: Apple App Store Review Guidelines, 5.1.1(v).

## Qué NO cambia

- Favoritos, publicación, solicitudes, notificaciones y gestión de cuenta siguen requiriendo sesión.
- La seguridad de Supabase no se relaja: las lecturas públicas continúan usando `propiedades_publicas`.
- No se abre acceso cliente a la tabla privada `propiedades`.
- No se añade Google Cloud ni Google Maps.
- Los perfiles pendientes/rechazados/suspendidos siguen sujetos al flujo de aprobación.

## Validación requerida

El cambio debe pasar TypeScript, lint, tests, export Web y native-config antes de considerarse cerrado. Además debe probarse físicamente en iOS y Android, y en Web en escritorio/tablet/teléfono.

## Bloqueadores de release que permanecen

1. Prueba física iPhone.
2. Prueba física Android.
3. Prueba Web responsive.
4. Verificación real de enlaces de confirmación/recovery.
5. Verificación de notificaciones push en dispositivo físico.
6. Confirmar una URL HTTPS pública y funcional para el aviso de privacidad antes de App Store Connect.
7. Activar Leak Password Protection de Supabase.
8. Ejecutar build EAS de producción y probar el binario antes de enviar.

No se modifica `main` ni se hace merge a `release/eyesite-definitive` todavía.
