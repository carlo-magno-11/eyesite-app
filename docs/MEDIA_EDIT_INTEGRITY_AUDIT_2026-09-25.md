# EYESITE — Integridad de medios durante edición 2026-09-25

## Hallazgo crítico corregido

La inicialización del editor de propiedades convertía referencias existentes mediante `normalizeArray()`. Esa función está diseñada para **medios públicos**, pero no es apropiada para documentos privados de `eyesite-private`.

En consecuencia, una edición podía:
- perder referencias existentes de archivos privados;
- convertir rutas de Storage en referencias públicas incorrectas;
- y, en el editor de solicitudes pendientes, omitir medios existentes porque las cadenas no tenían la marca `existing`.

## Corrección

Se agregó `preserveExistingFileItems()`, que conserva las referencias de Storage como referencias existentes sin convertirlas a URL pública.

Ahora:
- fotografías, fotos profesionales y videos existentes se conservan durante una edición;
- archivos privados existentes conservan su `path/url` original;
- PDF y KMZ/KML existentes se mantienen;
- los archivos nuevos siguen pasando por `uploadFile()`;
- la RPC sigue siendo la única vía para modificar propiedades;
- no se modificó ninguna política RLS ni se abrió ningún bucket.

## Alcance

Se corrigieron tanto:
- edición de propiedades publicadas;
- edición de solicitudes pendientes.

Esto evita que simplemente abrir, modificar un campo y guardar pueda eliminar accidentalmente medios/documentos ya existentes.

## Validación pendiente

Debe hacerse una edición real de una propiedad que tenga:
1. fotografía existente;
2. video existente;
3. al menos un PDF/KMZ/KML privado.

Después de guardar, comprobar que todos continúan presentes en la propiedad y que los documentos privados siguen requiriendo la Edge Function de URL firmada.
