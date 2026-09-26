# EYESITE — Auditoría de producto, ingeniería y UX
## 2026-09-26

### Hallazgos críticos cerrados en esta revisión

1. Catálogo: la búsqueda usaba `.or()` con texto introducido por usuario sin una sanitización suficientemente estricta para la sintaxis PostgREST.
2. Catálogo: la búsqueda no incluía `tipo`, `codigo` ni `direccion`, por lo que buscar "Terreno" podía devolver 0 aunque existieran propiedades de tipo terreno.
3. Catálogo: los parámetros de navegación `filter`/`q` podían quedar obsoletos si la pantalla se reutilizaba en navegación.
4. Paginación: se solicitaba una fila adicional para detectar `hasMore`; se ajustó para pedir exactamente el tamaño de página.

### Estado de datos verificado

- Propiedades activas: 10.
- Filas públicas: 10.
- Propiedades con coordenadas: 3.
- Propiedades activas sin coordenadas: 7.
- Solicitudes pendientes: 1.
- Referencias staging/private detectadas en el catálogo público: 0.

### Producto / UX

Prioridad P0:
- Probar físicamente el flujo Inicio -> Ver oportunidades -> búsqueda -> filtro -> detalle.
- Probar búsqueda en iOS, Android y Web con: título, municipio, tipo, código, dirección, texto inexistente y caracteres especiales.
- Añadir estados claros para búsqueda: cargando, resultados, sin resultados y error recuperable.
- Evitar que el catálogo dependa únicamente de navegación secundaria; la búsqueda debe ser una acción primaria desde Inicio.

Prioridad P1:
- Añadir búsqueda global visible en Inicio.
- Soportar consultas naturales básicas: "terrenos en Mérida", "casas hasta 2M", etc., sin sustituir los filtros estructurados.
- Añadir ordenamiento: relevancia, precio menor/mayor, superficie y recientes.
- Mantener filtros activos y permitir limpiarlos en un toque.
- Mostrar cantidad real de resultados, no una aproximación cuando sea posible.
- Mejorar la ficha para convertir interés en contacto: WhatsApp, llamada, guardar, compartir, solicitar visita y ubicación.

Prioridad P1 de diseño:
- Reducir la densidad visual de filtros avanzados en móvil mediante un botón "Filtros".
- Mantener una jerarquía clara entre precio, ubicación, superficie y atributos secundarios.
- Añadir skeleton loading en lugar de una pantalla vacía con spinner.
- Normalizar textos, capitalización y traducción de toda la experiencia pública.
- Revisar accesibilidad: tamaños táctiles, contraste, labels y navegación por teclado en Web.

### Ingeniería

- Mantener `propiedades_publicas` como frontera pública y `propiedades` detrás de RPC/admin.
- Mantener el flujo de promoción de medios como única vía de staging -> producción.
- Añadir pruebas E2E reales del ciclo solicitud -> promoción -> aprobación -> catálogo -> detalle -> mapa.
- Sustituir offset pagination por cursor/keyset cuando el catálogo crezca significativamente.
- Considerar búsqueda server-side dedicada con índice de texto/trigramas cuando el volumen justifique el cambio; no activar extensiones solo por anticipación.
- Medir consultas lentas con `pg_stat_statements` antes de optimizar a ciegas.
- Mantener Realtime desacoplado de los filtros de catálogo y con lifecycle controlado.
- Validar que todas las rutas públicas funcionan sin sesión y que las acciones privadas siguen protegidas.
- Completar pruebas de push en dispositivo real; la implementación existe pero no debe confundirse con una prueba E2E.

### Mapa

- Arquitectura Leaflet + OpenStreetMap, sin Google Cloud.
- El RPC geográfico ya filtra server-side.
- El problema actual de cobertura es de datos: 3/10 propiedades tienen coordenadas.
- No inventar coordenadas.
- Próxima mejora de producto: control de radio, "usar mi ubicación", ajuste automático del viewport a resultados y mensaje específico cuando una propiedad no tiene ubicación.
- El mapa debe mostrar claramente que solo muestra propiedades publicadas por EYESITE.

### Negocio / innovación

La base ya permite evolucionar EYESITE de catálogo a plataforma de captación:

1. Búsquedas guardadas + alertas.
2. Recomendaciones explicables según presupuesto/zona.
3. Embudo comercial de prospectos.
4. Eventos de propiedad: vista, mapa, favorito, contacto, visita y oferta.
5. Panel de conversión para administración.
6. Alertas automáticas cuando una nueva propiedad coincide con un cliente.
7. Comparador de propiedades.
8. Solicitud de visita con horario.
9. Seguimiento comercial posterior al contacto.
10. Métricas por propiedad: vistas, favoritos, contactos y conversiones.

### Riesgos que todavía impiden declarar "App Store lista"

- Pruebas físicas iOS/Android/Web todavía pendientes.
- Push E2E todavía pendiente.
- Falta cerrar/verificar la referencia legacy de storage identificada en una propiedad activa.
- Leaked Password Protection de Supabase continúa desactivada y su disponibilidad depende del plan de Supabase.
- La política de privacidad/URL pública debe verificarse en producción.
- La solicitud pendiente no debe aprobarse automáticamente durante pruebas.

### Criterio de salida

No considerar EYESITE terminada hasta que:
- CI esté verde en el commit candidato.
- iOS native-config esté verde.
- Web export esté verde.
- búsqueda y filtros tengan E2E real.
- publicación de una solicitud de prueba esté verificada de extremo a extremo.
- mapa tenga datos reales suficientes o un estado UX correcto para propiedades sin coordenadas.
- privacidad y términos estén accesibles públicamente.
- se realice una prueba física de iOS y una revisión de Android/Web.
