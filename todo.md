# EYESITE App - TODO

- [x] Configurar tema oscuro con paleta de colores Eyesite (dorado, negro, blanco)
- [x] Generar logo/icono de la app EYESITE
- [x] Actualizar app.config.ts con nombre y branding
- [x] Configurar tab bar con 5 tabs (Inicio, Propiedades, Publicar, Favoritos, Nosotros)
- [x] Crear datos de propiedades de ejemplo (basados en Eyesite.mx)
- [x] Crear pantalla Home con hero, propiedades destacadas y categorías
- [x] Crear pantalla Propiedades con listado, búsqueda y filtros
- [x] Crear pantalla Detalle de Propiedad con galería, info y botones de contacto
- [x] Crear pantalla Publicar Propiedad con formulario completo
- [x] Crear pantalla Favoritos con lista de propiedades guardadas
- [x] Crear pantalla Nosotros/Contacto con info de la empresa
- [x] Implementar funcionalidad de favoritos con Supabase (AsyncStorage solo para sesión)
- [x] Implementar búsqueda y filtros de propiedades
- [x] Implementar formulario de publicar propiedad con selección de imágenes
- [x] Agregar botones de contacto (WhatsApp, llamada, email)
- [x] Añadir iconos al icon-symbol.tsx

- [x] Storage staging privado para solicitudes de propiedades
- [x] Bloqueo de uploads arbitrarios en buckets legacy
- [x] Publicación de medios solo al aprobar
- [x] Limpieza de medios staging al aprobar/rechazar

## Auditoría final — 2026-09-12
- [x] Corregido bloqueo potencial de AuthGate cuando existe sesión pero falta `profiles` (la navegación a `create-profile` ahora puede ejecutarse).
- [x] Eliminado el camino de moderación directo del hook legacy `usePropertySubmissions`; la moderación queda centralizada en el flujo de revisión con medios staging.
- [x] Corregida limpieza de medios privados después de rechazo.
- [x] Agregada limpieza de medios públicos huérfanos si falla la aprobación después de copiar archivos.
- [x] Eliminados scripts de servidor inexistente del `package.json`; EYESITE usa Expo + Supabase.
- [ ] Ejecutar `pnpm install --frozen-lockfile` y después `pnpm check`/`pnpm test` en una máquina con dependencias instaladas.
- [ ] Prueba manual completa: registro → términos → pendiente → publicación → revisión admin → aprobación → propiedad pública.
- [ ] Prueba manual de rechazo y verificación de que staging queda vacío.
- [ ] Mejorar estado compartido de favoritos para sincronización instantánea entre múltiples `PropertyCard` montadas.
