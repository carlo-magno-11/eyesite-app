# EYESITE — Control de acceso hasta aprobación administrativa

Fecha: 2026-09-25
Rama: fix/web-map-layout-final
Commit: b40d99b3107bbc3b9bcffd8a86491020809c6ac5

## Regla de negocio confirmada

Una cuenta registrada no puede entrar a las áreas de la aplicación hasta que el administrador apruebe su perfil.

El usuario puede completar únicamente las etapas necesarias del flujo de alta:
1. Registro/autenticación.
2. Verificación de correo.
3. Creación del perfil.
4. Aceptación de términos.
5. Pantalla de espera de aprobación.

Si el perfil queda en estado pendiente, se redirige a /pending.
Si queda rechazado o suspendido, se redirige a /denied.
Solo con estado activa se permite entrar a la aplicación.

## Cambio realizado

Antes, AuthGate consideraba como públicas las rutas:
- /(tabs)
- /(tabs)/properties
- /(tabs)/map
- /property/[id]

Eso permitía que una cuenta pendiente pudiera navegar por propiedades/mapa aunque el flujo principal la redirigiera a /pending.

Ahora esas rutas ya no son excepciones de seguridad. Para una sesión autenticada que todavía no tenga aprobación administrativa, el AuthGate las considera protegidas y aplica el estado del perfil.

Se mantienen como rutas de proceso:
- autenticación
- verificación de correo
- creación de perfil
- términos
- pending
- denied

## Importante

Esto corrige el control de navegación de la aplicación. La seguridad real de los datos sigue dependiendo de RLS, vistas públicas y RPCs administrativos en Supabase; no se sustituye esa capa por navegación cliente.

## Pruebas pendientes

No se declara validación física todavía. Debe probarse:
- usuario nuevo sin perfil;
- correo no confirmado;
- perfil pendiente intentando Home, Propiedades, Mapa y detalle por URL;
- perfil rechazado/suspendido;
- perfil activo;
- cambio pendiente -> activa desde el panel administrativo y retorno a la app;
- cierre y reapertura de sesión;
- iOS, Android y Web.
