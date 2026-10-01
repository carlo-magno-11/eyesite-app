# EYESITE — Auditoría de subida de medios 2026-09-25

## Hallazgo corregido

Se detectó una fragilidad concreta en `public/admin.js`: `uploadFile()` confiaba primero en `File.type`. Algunos navegadores/seleccionadores pueden entregar un MIME genérico como `application/octet-stream` aunque la extensión sea válida. Eso podía bloquear un MP4 válido antes de llegar a Supabase Storage y es compatible con el error HTTP 400 observado durante la edición.

### Corrección

La subida ahora:
- conserva el MIME específico que entrega el navegador cuando existe;
- usa el MIME derivado de la extensión solamente si el navegador entrega MIME vacío o genérico;
- mantiene la lista de tipos permitidos;
- mantiene el límite de 200 MB para medios;
- envía `contentType` explícitamente al Storage.

No se acepta un MIME específico incompatible simplemente por coincidir la extensión. La corrección no elimina las validaciones de seguridad.

## Flujo de aprobación revisado

La aprobación continúa separada en dos pasos:

1. `promote-submission-media` valida administrador, propiedad de los medios, MIME/tamaño y copia desde `eyesite-staging` a `eyesite-media`.
2. Solo si `promotion_complete=true`, el panel llama a `admin_approve_property_request`.
3. La RPC crea la propiedad con estado `activa`; el trigger sincroniza `propiedades_publicas`.
4. La app consume `propiedades_publicas`.

La Edge Function está desplegada y activa, versión 3, y realiza autenticación propia del JWT más comprobación del rol admin.

## Estado de datos verificado

En Supabase:
- propiedades activas de origen: 10
- registros en `propiedades_publicas`: 10
- activas sin coordenadas: 7
- activas sin medios: 0

Por lo tanto, el problema de mapa no es actualmente una pérdida de sincronización del caché: hay 10/10 sincronizadas. Solo las propiedades con coordenadas válidas pueden aparecer en el mapa.

## Pendientes

- Probar físicamente en Safari/macOS el MP4 que anteriormente produjo HTTP 400.
- Probar el flujo real solicitud pendiente → editar → guardar → promover medios → aprobar → propiedad publicada → `propiedades_publicas` → app/mapa.
- No se debe inventar coordenadas para las 7 propiedades que carecen de ellas.
- Security Advisor sigue mostrando los avisos existentes sobre `pg_net` en `public`, funciones SECURITY DEFINER ejecutables por authenticated y protección contra contraseñas filtradas desactivada. No se revocaron funciones administrativas masivamente porque el flujo depende de ellas y sus cuerpos ya contienen comprobaciones de administrador.
