# EYESITE — Auditoría de propiedades y multimedia — 2026-09-22

## Hallazgos confirmados

### 1. Propiedades publicadas
- Producción contiene 9 propiedades activas.
- La app lee exclusivamente `propiedades_publicas`.
- `propiedades_publicas` contiene 9 filas.
- `propiedades_cambios` está habilitada para Realtime y tiene política SELECT pública limitada a metadatos de cambio.
- Se corrigió en producción el trigger `sync_propiedades_publicas_cache`, que apuntaba a una tabla inexistente (`propiedades_publicas_cache`). La corrección está documentada en PR #6.
- Se validó una actualización inocua de una propiedad: el UPDATE terminó correctamente, el feed registró `accion='update'` y la fila pública siguió sincronizada.

### 2. Edición desde el panel
- `public/admin.js` usa `admin_update_property(uuid,jsonb)` para editar propiedades; no hace UPDATE directo desde el navegador.
- El RPC tiene una lista blanca de campos editables y exige `is_admin()`.
- El formulario del panel construye los campos de casa (construcción, recámaras, baños, estacionamientos y plantas) dentro de `detalles`.
- Las imágenes, videos, portada, archivos, PDFs, KMZ/KML, enlaces y coordenadas se incluyen en el payload de edición.

### 3. Multimedia / MP4
- El bucket `eyesite-media` admite JPEG/PNG/WebP/GIF y MP4/MOV/M4V, con límite de 200 MB.
- El panel sanitiza el nombre del archivo, genera una ruta única y envía explícitamente el MIME.
- Producción ya contiene videos MP4 válidos en `eyesite-media/videos/`, por lo que el error HTTP 400 observado anteriormente no corresponde a una prohibición general de MP4.
- El panel actual valida extensión/MIME antes de subir. Si vuelve a aparecer 400, debe capturarse el `statusCode`, mensaje de Storage, MIME y tamaño del archivo concreto para aislar el caso.

### 4. Notificaciones y anuncios
- La app consulta `notificaciones` únicamente para el usuario autenticado.
- Los anuncios públicos están restringidos en producción a activos, publicados, programados y no expirados.
- El panel usa funciones/RLS de administrador para operaciones sensibles.
- Push utiliza Expo; no requiere Google Cloud.

## Riesgos/pendientes

1. `propiedades_publicas` contiene columnas de documentos/archivos que actualmente están vacías en los registros públicos revisados. Si en el futuro se llenan con rutas de `eyesite-private`, no deben convertirse en URLs públicas ni exponerse como contenido descargable sin una política explícita.
2. Falta la prueba física final en iPhone para confirmar que una edición realizada desde el panel aparece después del regreso/refresh de la pantalla y que el video se reproduce.
3. El error 400 de MP4 debe considerarse resuelto a nivel de validación del cliente solo después de repetir una carga real desde el panel.

## Regla de seguridad mantenida
No se modifica `main` automáticamente. Las correcciones se mantienen en ramas/PRs hasta validación.
