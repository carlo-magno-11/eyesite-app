# EYESITE — Auditoría y cambio: editor de solicitudes pendientes
Fecha: 2026-09-25

## Estado
- Rama de trabajo: `fix/web-map-layout-final`.
- `main` no fue modificado.
- El RPC fue aplicado directamente en Supabase y después verificado mediante consultas de definición y privilegios.
- La migración de este archivo es el registro reproducible de esa definición.

## Cambio implementado
La sección **Por aprobar** puede abrir el editor de propiedad y guardar correcciones/enriquecimiento sin publicar la solicitud. El editor contempla los campos existentes de `solicitudes_propiedades`, incluidos datos generales, ubicación, dimensiones, precios, información legal, contacto/propietario, medios, documentos, enlaces, datos de casa, sesión/comisión y coordenadas.

## Regla de seguridad
Guardar una solicitud editada **no la publica**.

Flujo:
1. Solicitud pendiente.
2. Administrador pulsa Editar.
3. Se usa el editor completo.
4. Guardar llama a `admin_update_property_request`.
5. El RPC exige `auth.uid()` y `public.is_admin()`.
6. El RPC bloquea solicitudes que ya no estén pendientes.
7. El RPC solo actualiza columnas explícitamente definidas.
8. La función no cambia `estado` a aprobada.
9. La función registra la modificación en `admin_activity_log`.
10. La aprobación continúa siendo una acción separada mediante el RPC de aprobación existente.

## Base de datos
Migración:
`supabase/migrations/20260925010000_admin_update_pending_property_request.sql`

RPC:
`public.admin_update_property_request(uuid,jsonb)`

Verificación realizada en Supabase:
- `SECURITY DEFINER`: sí.
- `search_path`: `public, pg_temp`.
- `anon` EXECUTE: denegado.
- `authenticated` EXECUTE: concedido.
- La definición real fue alineada con los tipos actuales de `solicitudes_propiedades` (numeric, integer, boolean, date, arrays, jsonb, etc.).

## Hallazgo importante corregido
La primera migración escrita como documento no coincidía exactamente con la función que se había aplicado directamente en Supabase y además usaba un mecanismo genérico de actualización. No se dejó así: se inspeccionó el esquema real y se reemplazó la migración por una definición explícita y tipada. Esto evita depender de columnas inventadas/no existentes y hace que el registro Git sea reproducible.

## Lo que todavía no se declara como probado
- Guardado real desde una sesión de administrador en el navegador; actualmente no se ejecutó porque Supabase no tiene solicitudes en estado `pendiente` disponibles para una prueba real.
- Prueba negativa ejecutada sin sesión: el RPC rechazó correctamente la llamada con `42501` antes de buscar la solicitud.
- Edición de una solicitud real y confirmación visual de todos los campos; requiere disponer de una solicitud de prueba pendiente.
- Flujo completo editar → aprobar → verificar publicación en `propiedades`/`propiedades_publicas`.
- Subidas reales de foto/video/PDF/KMZ/KML desde navegador, iPhone y Android.
- Lint/build/tests y pruebas físicas de responsive.

## Hallazgo de código corregido en esta etapa
`collectPropertyForm()` tenía una expresión de precedencia que podía intentar leer `propiedadEditando.detalles` mientras se editaba una solicitud pendiente. Se reemplazó por una selección explícita de la fuente (`edit` vs `pending`) para evitar un fallo de JavaScript durante la edición pendiente.

No se presenta ninguno de esos puntos como completado hasta ejecutarlos.
