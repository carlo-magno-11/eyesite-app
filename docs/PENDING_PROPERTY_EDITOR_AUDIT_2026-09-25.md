# EYESITE — Auditoría y cambio: editor de solicitudes pendientes
Fecha: 2026-09-25

## Estado
- Rama de trabajo: `fix/web-map-layout-final`
- `main` no fue modificado.
- El cambio de esta etapa no se ha aplicado a producción de Supabase.
- El flujo de aprobación existente se conserva.

## Cambio implementado
La sección **Por aprobar** ahora puede abrir el mismo formulario de propiedad usado por **Propiedades**, con:
- datos generales;
- plantilla terreno / terreno con casa;
- ubicación en mapa;
- precios y superficie;
- información legal;
- contacto y propietario;
- fotografías;
- fotografías profesionales;
- video y portada;
- archivos/PDF/KMZ/KML;
- enlaces;
- datos de casa cuando corresponda.

## Regla de seguridad
Guardar una solicitud editada **no la publica**.

Flujo:
1. Solicitud pendiente.
2. Administrador pulsa Editar.
3. Se usa el editor completo.
4. Guardar llama a `admin_update_property_request`.
5. El RPC verifica administrador.
6. El RPC verifica que la solicitud siga pendiente.
7. El RPC limita las columnas editables.
8. El RPC fuerza `estado='pendiente'`.
9. La solicitud queda pendiente hasta una aprobación explícita.

## Base de datos
Se añadió la migración:
`supabase/migrations/20260925010000_admin_update_pending_property_request.sql`

El RPC:
`public.admin_update_property_request(uuid,jsonb)`

No modifica `propiedades`, no aprueba solicitudes y no concede escritura directa a clientes.

## Pruebas pendientes antes de producción
- Ejecutar la migración en un entorno controlado.
- Probar editar → guardar → confirmar que sigue pendiente.
- Aprobar después de editar y verificar que los cambios llegan a `propiedades`.
- Verificar promoción de medios y rutas públicas.
- Probar foto/video/archivos desde navegador.
- Ejecutar lint/build/tests y revisión manual del panel.
