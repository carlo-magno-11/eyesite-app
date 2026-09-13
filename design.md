# EYESITE App - Plan de Diseño

## Identidad Visual

La app replica la identidad premium de Eyesite.mx: fondo negro/oscuro, tipografía blanca limpia, acentos dorados y fotografías aéreas de propiedades. El estilo es minimalista y de lujo inmobiliario.

**Paleta de colores:**
- Background: #0D0D0D (negro profundo)
- Surface: #1A1A1A (gris oscuro para tarjetas)
- Foreground: #F5F5F5 (blanco cálido para texto principal)
- Muted: #9A9A9A (gris para texto secundario)
- Primary/Accent: #C9A84C (dorado Eyesite)
- Border: #2A2A2A (borde sutil)
- Success: #4ADE80
- Error: #F87171

## Lista de Pantallas

1. **Splash / Onboarding** - Logo animado EYESITE con slogan
2. **Home** - Hero con slogan, propiedades destacadas, categorías
3. **Propiedades** (Tab) - Listado con filtros, búsqueda
4. **Detalle de Propiedad** - Galería, info completa, rendimiento, contacto
5. **Publicar Propiedad** (Tab) - Formulario para agregar propiedad
6. **Favoritos** (Tab) - Propiedades guardadas
7. **Contacto / Nosotros** (Tab) - Info empresa, WhatsApp, llamada

## Contenido y Funcionalidad por Pantalla

### Home
- Header con logo EYESITE
- Hero image con overlay oscuro y slogan "TODO BUEN PROYECTO INICIA CON UN BUEN TERRENO"
- Sección "Oportunidades Destacadas" con scroll horizontal de tarjetas
- Categorías: Terrenos, Casas, Haciendas, Ranchos, Industrial
- Sección "¿Por qué Eyesite?" con valores

### Propiedades
- Barra de búsqueda en la parte superior
- Filtros por tipo: Todos, Terreno, Casa, Hacienda, Rancho, Industrial
- Grid de tarjetas con imagen aérea, nombre, ubicación, precio y rendimiento
- Indicador de rendimiento con color (verde = alto, amarillo = medio)

### Detalle de Propiedad
- Galería de imágenes con scroll horizontal (imágenes aéreas)
- Nombre y ubicación
- Precio del mercado vs precio actual
- Badge de rendimiento a la compra (%)
- Superficie y construcción en m²
- Descripción completa
- Botón "AGENDAR LLAMADA" (abre WhatsApp/teléfono)
- Botón "Guardar en Favoritos"

### Publicar Propiedad
- Formulario con campos:
  - Título de la propiedad
  - Tipo (Terreno, Casa, Hacienda, Rancho, Industrial)
  - Ubicación (municipio, estado)
  - Superficie (m²)
  - Precio por m²
  - Precio del mercado por m²
  - Descripción
  - Fotos (galería de imágenes)
- Botón "Publicar"

### Favoritos
- Lista de propiedades guardadas
- Opción de eliminar de favoritos
- Estado vacío con mensaje motivacional

### Contacto
- Logo y misión/visión de Eyesite
- Botón WhatsApp directo
- Botón llamada telefónica
- Correo electrónico
- Dirección en Mérida, Yucatán
- Links a redes sociales

## Flujos de Usuario Clave

**Explorar propiedad:**
Home → Toca tarjeta destacada → Detalle → Agenda llamada

**Buscar propiedad:**
Tab Propiedades → Escribe búsqueda o selecciona filtro → Toca tarjeta → Detalle

**Publicar propiedad:**
Tab Publicar → Llena formulario → Agrega fotos → Publica

**Guardar favorito:**
Detalle → Toca ícono corazón → Aparece en Tab Favoritos

## Tab Bar

| Tab | Ícono | Nombre |
|-----|-------|--------|
| 1 | house.fill | Inicio |
| 2 | building.2.fill | Propiedades |
| 3 | plus.circle.fill | Publicar |
| 4 | heart.fill | Favoritos |
| 5 | person.fill | Nosotros |
