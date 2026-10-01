# EYESITE — Optimización de transferencia de Favoritos

Fecha: 2026-09-25

## Hallazgo

`app/(tabs)/favorites.tsx` consultaba `propiedades_publicas` con `.select('*')`, aunque la pantalla solo necesita los datos de las tarjetas.

## Cambio aplicado

Se sustituyó la consulta por una lista explícita `FAVORITES_FIELDS` equivalente al contrato ligero del catálogo. Se conservan portada/fotos, precio, superficie, ubicación, estado, coordenadas y metadatos necesarios para `PropertyCard`.

Se excluyen de esta lectura los campos de detalle y documentos: descripción, JSON de características/detalles/servicios, archivos privados, PDF, KMZ/KML, enlaces y otros datos que no se renderizan en Favoritos.

## Verificación de datos actuales

La vista pública tiene actualmente 10 propiedades activas. `fotos` tiene una media de 1 elemento y un máximo de 2; los campos JSON/documentales revisados son pequeños, pero no son necesarios para esta pantalla.

## Alcance

No se modificó el esquema de Supabase ni se añadió una migración. El cambio es de cliente, reversible y mantiene la consulta segura sobre `propiedades_publicas`. Los favoritos siguen resolviéndose por sus IDs y conservan su orden.

## Estado

Aplicado en `fix/eyesite-platform-security-20260925`. Pendiente de CI y prueba funcional Web/iOS/Android antes de cerrar esta etapa.