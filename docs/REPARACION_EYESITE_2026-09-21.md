# EYESITE — Registro de reparaciones
## 21 de septiembre de 2026

Este documento registra las reparaciones realizadas sobre la rama principal durante la revisión de seguridad, persistencia de propiedades, multimedia y documentos.

### 1. Frontera de lectura pública
- La app móvil lee exclusivamente `propiedades_publicas`.
- La app ya no consulta directamente `propiedades`.
- La vista pública expone únicamente los campos necesarios para mostrar propiedades activas.
- Los cambios de propiedades se notifican mediante `propiedades_cambios`; la app vuelve a consultar la vista pública después de cada cambio.
- La lectura directa de `propiedades` para usuarios normales permanece bloqueada.

### 2. RLS de perfiles
- Se consolidaron las políticas de SELECT y UPDATE de `profiles`.
- Un administrador puede gestionar perfiles.
- Un usuario autenticado puede consultar/actualizar su propio perfil sin poder cambiar por sí mismo `role` ni `estado`.

### 3. Moderación administrativa
- Las operaciones de crear/editar/aprobar/rechazar propiedades se realizan mediante RPC administrativas.
- Las RPC administrativas usan `SECURITY DEFINER`, `search_path = public` y comprobación de administrador.
- Se retiró EXECUTE de RPC antiguas/internas que no deben funcionar como API pública: `admin_aprobar_solicitud`, `current_profile_role`, `current_profile_estado` e `is_admin`.

### 4. Realtime
- Se creó `propiedades_cambios` con RLS.
- Un trigger interno registra INSERT/UPDATE/DELETE de propiedades.
- La función del trigger no queda expuesta como RPC a `anon` ni `authenticated`.
- La app escucha esta tabla y después vuelve a leer `propiedades_publicas`.

### 5. Multimedia del panel
- `eyesite-media` se mantiene público para las imágenes/videos aprobados.
- El límite del bucket es 200 MB y admite JPEG, PNG, WebP, GIF, MP4, MOV y M4V.
- `eyesite-private` se mantiene privado para documentos.
- El panel clasifica PDFs y KMZ/KML al guardar una propiedad.
- Se conserva la portada, video, fotografías normales y fotografías profesionales por separado.
- Se corrigió un error real de JavaScript en `public/admin.js`: existía una declaración duplicada de `const originalName` dentro de `uploadFile`, que podía romper la ejecución del archivo completo.
- Se hizo más tolerante la detección MIME para Safari/navegadores que entregan `file.type` vacío, usando también la extensión.
- Se corrigió la validación de videos y fotografías para no rechazar archivos válidos solamente porque el navegador no informó MIME.

### 6. Error MP4 HTTP 400 investigado
El MP4 reportado anteriormente no supera el límite:
- tamaño observado: aproximadamente 8.85 MB;
- tipo almacenado: `video/mp4`;
- bucket: `eyesite-media`;
- existen copias del archivo en Storage.

Por ello el 400 no era un problema de tamaño. La corrección del panel elimina una causa de incompatibilidad por MIME y además registra bucket, ruta, nombre, MIME, tamaño y status de Storage cuando una subida falla.

### 7. Documentos privados
- Se mantiene `eyesite-private` como bucket privado.
- Se añadió la Edge Function `get-property-document`.
- La función valida JWT, perfil activo/admin, propiedad activa y asociación del archivo con la propiedad.
- Devuelve URLs firmadas temporales de una hora.
- Rechaza rutas externas, traversal (`..`) y rutas inválidas.
- La pantalla de detalle solicita los documentos mediante esta función.

### 8. Formularios de propiedades
El panel distingue:
- solo terreno;
- terreno con casa / hacienda / rancho / departamento.

Para propiedades con casa se manejan construcción, recámaras, baños, estacionamientos y plantas. Para publicar se valida título, tipo, municipio, superficie, precio, descripción, estatus legal y fotografía principal.

### 9. Categorías
Se alinearon las categorías compartidas de la app para incluir:
- Casa
- Departamento
- Terreno
- Hacienda
- Rancho
- Industrial
- Local
- Oficina

### 10. Inicio de la app
Si no existe ninguna propiedad marcada como destacada, la sección destacada utiliza las primeras propiedades reales activas en lugar de quedar vacía. No se agregaron datos falsos a la app.

### 11. Calidad
Se añadió GitHub Actions en `.github/workflows/quality.yml` para ejecutar:
- instalación reproducible con pnpm;
- TypeScript (`pnpm check`);
- lint (`pnpm lint`).

No se marca como “pasado” hasta disponer de una ejecución confirmada del workflow.

### 12. Estado actual de seguridad
El Security Advisor de Supabase actualmente reporta:
- 1 ERROR sobre `propiedades_publicas` como SECURITY DEFINER view;
- 1 WARN sobre `pg_net` en schema `public`;
- 17 WARN sobre funciones administrativas SECURITY DEFINER ejecutables por usuarios autenticados;
- 1 WARN por protección contra contraseñas filtradas desactivada.

Los 17 RPC administrativas no se revocan ciegamente porque el panel de administración depende de ellas y sus cuerpos ya fueron auditados para comprobar autorización de administrador y `search_path`.

La vista `propiedades_publicas` es deliberadamente el puente público de lectura mientras el acceso directo a `propiedades` está bloqueado. Eliminar SECURITY DEFINER sin rediseñar esta frontera podría romper la seguridad y la lectura de la app.

### 13. Migraciones/commits relevantes
- `20260921150000_security_public_property_documents_boundary.sql`
- `20260921164700_security_property_select_and_duplicate_indexes.sql`
- `20260921172000_security_profiles_rls_consolidation.sql`
- `20260921173500_secure_property_realtime_feed.sql`
- `20260921180500_security_realtime_trigger_execute.sql`
- `20260921190000_security_revoke_legacy_rpc_execute.sql`
- `20260921200000_security_revoke_is_admin_rpc_execute.sql`
- reparación multimedia actual de `public/admin.js`: commit `239f48b7873ec793b5df434f975774bceddce83c`

### 14. Pendientes técnicos identificados
1. Ejecutar/confirmar el workflow de calidad de GitHub en una ejecución visible.
2. Continuar E2E de alta/edición/aprobación de propiedad.
3. Confirmar desde el panel real que un cambio editado aparece inmediatamente en la app.
4. Terminar la investigación del 400 de Storage si vuelve a aparecer después de la corrección MIME.
5. Evaluar por separado la migración de `pg_net` y la configuración de protección de contraseñas.
6. No eliminar buckets legacy mientras existan objetos sin migración comprobada.

### 15. Regla de arquitectura
EYESITE continúa por la ruta **sin Google Cloud**. El mapa usa Leaflet/OpenStreetMap y la seguridad de datos/media depende de Supabase, RLS, RPC administrativas y URLs firmadas para documentos privados.
