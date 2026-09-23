# EYESITE — Acceso para App Review

## Principio

EYESITE no ofrece acceso como visitante. La aplicación requiere una cuenta y conserva el flujo de registro, confirmación de correo y aprobación de acceso.

Para App Review se utilizará una cuenta de revisión dedicada con permisos de usuario normal, no de administrador.

## Preparación de la cuenta

Antes de enviar el binario a Apple:

1. Crear una cuenta dedicada en Supabase Auth.
2. Confirmar el correo.
3. Crear/completar su perfil.
4. Aceptar términos y versión vigente.
5. Establecer el perfil como `activa`.
6. Verificar que no tenga `role='admin'`.
7. Verificar inicio de sesión desde el build de producción.
8. Verificar propiedades, mapa, favoritos, notificaciones, perfil y cierre de sesión.

## Información que se entregará a App Review

Las credenciales de revisión se introducirán en App Store Connect/App Review Information, no en el código fuente.

Las instrucciones deben indicar que EYESITE requiere cuenta y que se proporcionan credenciales de prueba ya activadas para revisar las funciones protegidas.

## Seguridad

No se debe crear un modo visitante únicamente para facilitar App Review.

No se deben conceder privilegios administrativos a la cuenta de revisión.

No se debe desactivar la confirmación de correo ni la aprobación de cuentas en producción.

## Estado

La candidata `release/eyesite-definitive` ya mantiene el flujo de acceso restringido y contiene las correcciones de redirects Web/nativo.

Pendiente antes del envío final:
- crear la cuenta dedicada;
- probarla en el build de producción;
- confirmar las URLs de redirect permitidas en Supabase;
- completar la información de App Review;
- realizar una prueba completa de recuperación de contraseña y notificaciones.
