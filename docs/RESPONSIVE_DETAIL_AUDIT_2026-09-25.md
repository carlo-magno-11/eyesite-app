# EYESITE — Auditoría responsive del detalle de propiedad — 2026-09-25

## Hallazgo
En app/property/[id].tsx, las tarjetas de métricas y datos usaban porcentajes cercanos al 50% junto con gap de 10px. En React Native esto puede provocar que dos columnas superen el ancho disponible, especialmente en teléfonos y tabletas.

## Corrección
Se sustituyó el ancho rígido por:
- flexGrow: 1
- flexBasis: 45%
- minWidth: 140

Esto permite que el layout se adapte al ancho disponible conservando separación entre tarjetas.

## Alcance
- iOS
- Android
- Web
- No modifica lógica de datos, autenticación ni Supabase.

## Commit
54a97b66f9b9a83525304d9ef596129d1bd7a53e

## Pendiente de validación física
Probar detalle en:
375, 430, 768, 1024, 1280, 1440 y 1920 px, además de iPhone y Android reales.


## 2026-09-25 — Galería responsive

Se detectó que la galería del detalle mantenía 320 px de alto tanto en teléfonos como en pantallas grandes. Se sustituyó por una altura calculada a partir del ancho disponible, con límites para evitar galerías excesivamente pequeñas o grandes. La portada y el slide de vídeo comparten la misma altura calculada.

Commit: `f49cda371b44b59cf3d065c78cdf9689eeade390`.

Esto mantiene la experiencia nativa y Web en el mismo componente y evita que el detalle quede desproporcionado en escritorio.
