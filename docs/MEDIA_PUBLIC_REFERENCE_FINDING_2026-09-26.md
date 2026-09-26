# EYESITE — Hallazgo de referencias de media no promocionadas — 2026-09-26

## Hallazgo

La auditoría de producción encontró una propiedad activa que contiene una referencia relativa de media con formato de ruta de usuario:

- Propiedad: `Casa prueba  6`
- Campo: `portada_url`
- Referencia: `02415ee6-25b5-46af-94ee-f530d03437ce/imagenes/1789978345459-jc5lhoa74j8.jpg`

La misma ruta existe en el bucket `eyesite-staging` y no existe en `eyesite-media`.

El problema no aparecía en el chequeo anterior porque la referencia no incluía literalmente el nombre del bucket.

## Impacto

La función anterior `normalizeMediaUrl()` interpretaba cualquier ruta relativa como si perteneciera al bucket público `eyesite-media`. Esto podía convertir una referencia de staging en una URL pública inexistente y producir un 404 en la aplicación.

No se encontró evidencia de que el objeto privado haya sido expuesto: la ruta existe en `eyesite-staging`, no en el bucket público.

## Corrección de código

`lib/property-media.ts` ahora:

- rechaza URLs explícitas de `eyesite-staging` y `eyesite-private`;
- rechaza rutas `/storage/v1/object/public/eyesite-staging/...` y equivalentes privadas;
- rechaza rutas relativas que comienzan con un UUID de usuario, patrón utilizado por las rutas de staging detectadas;
- mantiene compatibilidad con rutas públicas relativas heredadas que no tienen ese patrón.

También se añadió:

`__tests__/property-media.test.ts`

con pruebas para rutas públicas, staging explícito, rutas UUID y filtrado de arrays.

## Estado de datos de producción

La propiedad afectada sigue necesitando reparación administrativa de su referencia de portada. No se modificó directamente la fila de producción durante esta auditoría, porque el cambio correcto debe preservar la frontera administrativa de publicación/promoción de medios.

La reparación esperada es volver a publicar/promover esa imagen mediante el flujo administrativo y guardar una referencia válida de `eyesite-media`, o retirar la portada si el medio ya no debe publicarse.

## Validación

En el mismo análisis se comprobó que:

- propiedades activas: 10;
- propiedades públicas activas: 10;
- propiedades activas sin proyección pública: 0;
- proyecciones públicas huérfanas: 0;
- referencias activas que apuntan físicamente a un bucket distinto de `eyesite-media`: 1.

Commit de protección:
`2101e342740304e159753b2994ad96e040b24764`

Commit del test:
`603c19e902826628392313963ced967710d80a8f`

## Estado de cierre

El código queda protegido contra este patrón en futuras lecturas. El dato histórico de `Casa prueba  6` queda abierto hasta realizar la corrección administrativa del medio y comprobar que la portada vuelve a cargar correctamente en Web/iOS/Android.
