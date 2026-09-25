# EYESITE — Auditoría intensiva y reparaciones 2026-09-25

## Rama de trabajo

- Base auditada: `feature/eyesite-commercial-crm`
- Rama de reparación aislada: `fix/eyesite-platform-security-20260925`
- `main` no se modifica en esta etapa.

## Hallazgos verificados

### 1. Realtime de detalle de propiedad — corregido

La migración vigente de EYESITE usa `propiedades_cambios.property_id` y acciones en minúsculas. El feed general ya estaba corregido, pero `useProperty()` todavía filtraba el canal por el nombre histórico `propiedad_id`.

Esto podía impedir que el detalle se actualizara inmediatamente después de una modificación administrativa.

Corrección:
- `hooks/use-properties.ts`: `filter: property_id=eq.<id>`.

### 2. Mapa Web — tamaño responsive — corregido

La documentación de la rama indicaba un mapa Web de 68% del viewport, con mínimo de 520px y máximo de 760px, pero el código había quedado en 58% / 420px / 720px.

Corrección:
- `app/(tabs)/map.tsx`: Web vuelve a 68% del viewport, mínimo 520px y máximo 760px.
- iOS/Android conservan el comportamiento flex.
- No se introduce Google Maps ni Google Cloud.

### 3. Compatibilidad Web del mapa — ya presente y verificada

La rama avanzada ya contiene `components/leaflet-map.web.tsx`, que usa un iframe HTML para Web, mientras la implementación base usa `react-native-webview` para nativo.

Esto mantiene separado el transporte del mapa por plataforma:
- iOS/Android: WebView nativo.
- Web: iframe + `postMessage`.
- Leaflet/OpenStreetMap en ambos casos.

La implementación de WebView oficial está orientada a plataformas nativas, por lo que mantener una implementación Web específica evita depender de un componente nativo en navegador.

### 4. `send-notification` — endurecimiento de entrada — corregido

La autorización administrativa ya estaba correctamente protegida. Se añadió validación explícita para:
- UUID de `user_id`, `user_ids`, `property_id` y `announcement_id`.
- máximo de 500 destinatarios.
- límite de payload HTTP de 64 KB.
- `titulo` hasta 120 caracteres.
- `mensaje` hasta 4000 caracteres.
- `tipo` hasta 64 caracteres.
- `event_key` hasta 160 caracteres.
- `in_app` estrictamente booleano.
- `data` como objeto JSON, no array, con máximo de 16 KB y serialización válida.
- límite final después de resolver favoritos/destinatarios.

## Seguridad que permanece pendiente de validación

1. Revisar físicamente todos los cuerpos `SECURITY DEFINER` y sus `search_path`.
2. Mapear consumidores de buckets públicos históricos antes de modificar/eliminar esos buckets.
3. Verificar configuración real de Supabase para protección de contraseñas filtradas.
4. Revisar dependencia/configuración de `pg_net`.
5. Verificar configuración real de Edge Functions y JWT/cron en el proyecto Supabase.
6. Ejecutar Advisor y pruebas físicas después de aplicar las migraciones correspondientes.
7. Probar el flujo completo de medios: envío → edición → promoción → aprobación → vista pública → mapa.
8. Probar anuncios/notificaciones en iOS, Android y Web, incluyendo programados, inmediatos, preferencias y reintentos.

## Hallazgo funcional adicional para la siguiente reparación

El panel administrativo publica anuncios inmediatos y actualmente invoca `send-notification` por separado, mientras `process-scheduled-communications` mantiene también el sistema de `anuncio_entregas`.

Debe cerrarse este contrato para que un anuncio inmediato no pueda recibir una segunda entrega cuando el scheduler procese el mismo anuncio. No se modifica todavía en este documento hasta completar la corrección idempotente por destinatario.

## Gate de salida

No se considera EYESITE listo para merge a `main` ni para binario final hasta completar:
- TypeScript.
- lint.
- tests.
- Expo Doctor.
- export Web.
- prueba física Web responsive.
- prueba física Android.
- prueba física iOS.
- pruebas de AuthGate.
- pruebas de Realtime.
- pruebas de publicación/moderación.
- pruebas de almacenamiento público/privado.
- pruebas de notificaciones y anuncios.

## Seguimiento de anuncios

La tabla `anuncio_entregas` tiene una restricción única por anuncio y usuario y el scheduler usa `upsert(..., ignoreDuplicates)`. Esto evita duplicar filas, pero el panel todavía llama directamente a `send-notification` para anuncios inmediatos. Antes del cierre final se debe unificar el propietario del envío push para garantizar que un anuncio no se entregue dos veces.
