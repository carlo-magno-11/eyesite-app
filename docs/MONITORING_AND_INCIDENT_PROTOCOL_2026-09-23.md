# EYESITE — Protocolo de monitoreo y respuesta

## Objetivo

Detectar problemas reales de producción sin recopilar innecesariamente datos personales ni debilitar la seguridad.

## Capas

### 1. Sentry — errores técnicos

La aplicación usa Sentry para:
- excepciones JavaScript/React Native;
- errores de navegación crítica;
- fallos de notificaciones;
- fallos de registro de push;
- contexto de versión/runtime.

La configuración mantiene `sendDefaultPii: false`.

El helper `lib/monitoring.ts` filtra claves sensibles antes de enviarlas como contexto. Nunca deben registrarse contraseñas, tokens, cookies, Authorization, secretos, correos o teléfonos.

### 2. Supabase — estado del backend

Supabase debe ser la fuente para comprobar:
- Auth;
- perfiles y estados de acceso;
- propiedades publicadas;
- notificaciones;
- anuncios;
- ejecuciones de Edge Functions;
- Realtime;
- Storage;
- errores de SQL/RPC.

No se debe resolver un incidente desactivando RLS o abriendo tablas a `anon`.

### 3. GitHub Actions — calidad antes de publicar

Cada cambio de la rama candidata debe pasar los checks del repositorio antes de considerarse liberable.

### 4. Pruebas de flujo

Los incidentes funcionales se reproducen siguiendo un protocolo, no únicamente mirando el error de consola.

## Clasificación

**P0 — bloqueo/crítico**
- usuarios no pueden iniciar sesión;
- datos expuestos;
- pérdida/corrupción de datos;
- administrador sin control;
- fallo general de producción.

**P1 — función principal afectada**
- propiedades no aparecen;
- administración no puede editar/aprobar;
- registro o recuperación falla;
- notificaciones no funcionan.

**P2 — función secundaria**
- Realtime se desconecta pero la recarga manual funciona;
- push no llega pero la bandeja interna funciona;
- fallo aislado de media.

**P3 — interfaz/documentación**
- texto incorrecto;
- diseño;
- mejoras no bloqueantes.

## Protocolo ante incidente

1. **Reproducir.**
   Registrar dispositivo/plataforma, versión de app, pantalla, acción y resultado.
2. **Clasificar.**
   Determinar P0/P1/P2/P3.
3. **Identificar la capa.**
   App → Auth → RPC/RLS → tabla → Edge Function → Storage → Realtime → push.
4. **Capturar evidencia.**
   Sentry, logs, respuesta HTTP/RPC y estado de Supabase.
5. **No hacer cambios destructivos.**
   No desactivar RLS, no hacer tablas públicas, no borrar usuarios/datos para probar.
6. **Crear corrección aislada.**
   Rama específica y migración idempotente si toca Supabase.
7. **Probar regresión.**
   Probar el flujo afectado y los permisos relacionados.
8. **Ejecutar CI.**
   No considerar lista una corrección hasta pasar los checks.
9. **Registrar resultado.**
   Documentar causa, solución, validación y posible riesgo.
10. **Promover a producción sólo después de validar.**

## Datos mínimos para reportar un problema

Cuando el usuario reporte un fallo, buscar:

- qué intentó hacer;
- pantalla;
- plataforma: iOS/Android/Web;
- versión;
- hora aproximada;
- si afecta a todos o a un usuario;
- mensaje visible;
- captura de pantalla si existe;
- error de Sentry;
- estado correspondiente en Supabase.

No pedir contraseñas, tokens, claves privadas ni credenciales de administrador.

## Salud periódica

Antes de cada release revisar:

- GitHub CI;
- errores recientes de Sentry;
- Auth;
- perfiles pendientes;
- propiedades activas/publicadas;
- sincronización `propiedades_publicas`;
- notificaciones;
- anuncios;
- Edge Functions;
- Realtime;
- Storage;
- privacidad;
- EAS build.

## Regla de seguridad

Una métrica verde no sustituye una prueba funcional.

Una prueba funcional correcta no sustituye la revisión de permisos.

Ambas deben cumplirse antes de publicar.
