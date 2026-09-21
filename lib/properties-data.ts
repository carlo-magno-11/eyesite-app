export type Property = {
  id: string;

  // Identificación
  title: string;
  titulo?: string;
  code?: string;
  codigo?: string;

  // Tipo y ubicación
  type: string;
  tipo?: string;
  location: string;
  ubicacion?: string;
  municipality?: string;
  municipio?: string;
  direccion?: string;

  // Precios
  price: number;
  precio?: number;
  currentPrice: number;
  precio_actual?: number;
  marketPrice: number;
  precio_mercado?: number;
  expectedPrice?: number;
  precio_esperado?: number;
  priceUnit?: string;
  unidad_precio?: string;
  moneda?: string;

  // Superficie
  surfaceM2: number;
  superficie?: number;
  surfaceUnit?: string;
  unidad_superficie?: string;
  frente?: number;
  fondo?: number;
  constructionM2?: number;
  construccion_m2?: number;

  // Rendimiento
  returnRate: number;
  rendimiento?: number;

  // Media
  image?: string;
  images?: string[];
  imagenes?: string[];
  fotos?: string[];
  fotos_pro?: string[];
  videos?: string[];
  video_url?: string | null;
  portada_url?: string | null;
  tipo_portada?: string;
  portada_tipo?: string;

  // Información
  description?: string;
  descripcion?: string;
  descripcion_pro?: string;

  detalles?: Record<string, any> | null;
  caracteristicas?: Record<string, any> | null;
  servicios_cercanos?: Record<string, any> | null;

  // Archivos y enlaces
  pdfs?: string[];
  kmz_kml?: string[];
  ubicaciones?: string[];
  tour_360?: string | null;
  archivos?: any[];
  enlaces?: any[];

  // Coordenadas
  latitud?: number | null;
  longitud?: number | null;

  // Estado
  estado?: string;
  activa?: boolean;

  // Destacada
  is_featured?: boolean;
  featured?: boolean;
  destacada?: boolean;

  // Legal / orden
  estatus_legal?: string;
  certeza_legal?: string;
  orden?: number;

  // Fechas
  created_at?: string;
  updated_at?: string;

  // Permite campos adicionales procedentes de Supabase
  [key: string]: any;
};

export const PROPERTY_TYPES = [
  'Casa',
  'Departamento',
  'Terreno',
  'Hacienda',
  'Rancho',
  'Industrial',
  'Local',
  'Oficina',
] as const;

export type PropertyType =
  typeof PROPERTY_TYPES[number];

export const PROPERTY_TYPES_OPTIONS =
  PROPERTY_TYPES.map((t) => ({
    key: t,
    label: t,
    value: t,
  }));

/*
 * La app ya no depende de propiedades simuladas.
 * Las propiedades reales vienen de Supabase.
 */
export const PROPERTIES: Property[] = [];

/*
 * Datos de ejemplo antiguos.
 *
 * Se conservan temporalmente para no romper otros imports
 * del proyecto, pero useProperties NO los utiliza como fallback.
 */
export const MOCK_PROPERTIES: Property[] = [
  {
    id: 'mock-terreno-1',
    price: 2450000,
    title: 'Terreno Residencial Temozón Norte',
    titulo: 'Terreno Residencial Temozón Norte',
    type: 'Terreno',
    tipo: 'Terreno',
    location: 'Mérida, Yucatán',
    municipio: 'Mérida',
    currentPrice: 2450000,
    precio_actual: 2450000,
    marketPrice: 2900000,
    precio_mercado: 2900000,
    priceUnit: 'm²',
    unidad_precio: 'm²',
    surfaceM2: 1250,
    superficie: 1250,
    returnRate: 15,
    rendimiento: 15,
    featured: true,
    destacada: true,
    estado: 'activa',
    code: 'EYE001',
    tipo_portada: 'foto',
    videos: [],
    images: [
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80',
      'https://images.unsplash.com/photo-1449844908441-8829872d2607?w=800&q=80',
    ],
    fotos: [
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80',
      'https://images.unsplash.com/photo-1449844908441-8829872d2607?w=800&q=80',
    ],
    description:
      'Terreno residencial en la zona de mayor plusvalía de Mérida, a 5 minutos de núcleos comerciales y colegios. Documentación en regla, lista para escriturar.',
    descripcion:
      'Terreno residencial en la zona de mayor plusvalía de Mérida, a 5 minutos de núcleos comerciales y colegios.',
  },

  {
    id: 'mock-terreno-2',
    price: 7800000,
    title: 'Hacienda Campestre Uxmal',
    titulo: 'Hacienda Campestre Uxmal',
    type: 'Hacienda',
    tipo: 'Hacienda',
    location: 'Uxmal, Yucatán',
    municipio: 'Santa Elena',
    currentPrice: 7800000,
    precio_actual: 7800000,
    marketPrice: 9200000,
    precio_mercado: 9200000,
    priceUnit: 'ha',
    unidad_precio: 'ha',
    surfaceM2: 25000,
    superficie: 25000,
    returnRate: 12,
    rendimiento: 12,
    featured: true,
    destacada: true,
    estado: 'activa',
    code: 'EYE002',
    tipo_portada: 'foto',
    videos: [],
    images: [
      'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80',
      'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800&q=80',
    ],
    fotos: [
      'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80',
      'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800&q=80',
    ],
    description:
      'Hacienda campestre con casa principal restaurada, pozo y arboleda. Ideal para proyecto ecoturístico cerca de la zona puuc.',
    descripcion:
      'Hacienda campestre con casa principal restaurada, pozo y arboleda.',
  },

  {
    id: 'mock-terreno-3',
    price: 5100000,
    title: 'Terreno Comercial Anillo Periférico',
    titulo: 'Terreno Comercial Anillo Periférico',
    type: 'Terreno',
    tipo: 'Terreno',
    location: 'Mérida, Yucatán',
    municipio: 'Mérida',
    currentPrice: 5100000,
    precio_actual: 5100000,
    marketPrice: 5900000,
    precio_mercado: 5900000,
    priceUnit: 'm²',
    unidad_precio: 'm²',
    surfaceM2: 3400,
    superficie: 3400,
    returnRate: 9,
    rendimiento: 9,
    estado: 'activa',
    code: 'EYE003',
    tipo_portada: 'foto',
    videos: [],
    images: [
      'https://images.unsplash.com/photo-1464146072230-91cabc968266?w=800&q=80',
    ],
    fotos: [
      'https://images.unsplash.com/photo-1464146072230-91cabc968266?w=800&q=80',
    ],
    description:
      'Terreno comercial sobre anillo periférico con frente de 45 metros, uso de suelo comercial aprobado y acceso a servicios.',
    descripcion:
      'Terreno comercial sobre anillo periférico con frente de 45 metros.',
  },

  {
    id: 'mock-terreno-4',
    price: 4300000,
    title: 'Rancho Ganadero Tekax',
    titulo: 'Rancho Ganadero Tekax',
    type: 'Rancho',
    tipo: 'Rancho',
    location: 'Tekax, Yucatán',
    municipio: 'Tekax',
    currentPrice: 4300000,
    precio_actual: 4300000,
    marketPrice: 4800000,
    precio_mercado: 4800000,
    priceUnit: 'ha',
    unidad_precio: 'ha',
    surfaceM2: 50000,
    superficie: 50000,
    returnRate: 10,
    rendimiento: 10,
    estado: 'activa',
    code: 'EYE004',
    tipo_portada: 'foto',
    videos: [],
    images: [
      'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=800&q=80',
    ],
    fotos: [
      'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=800&q=80',
    ],
    description:
      'Rancho ganadero con corrales, abrevaderos y pasto introducido. Contiguo a carretera estatal, ideal para ganado mayor.',
    descripcion:
      'Rancho ganadero con corrales, abrevaderos y pasto introducido.',
  },
];

export const getReturnColor = (value: number) => {
  if (value >= 15) return 'green';
  if (value >= 8) return 'yellow';
  return 'red';
};

export const formatPrice = (
  price: number,
  unit?: string
) => {
  void unit;

  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(price);
};

export const formatSurface = (
  surface: number,
  unit?: string
) => {
  const normalizedUnit = String(unit || 'm²').trim() || 'm²';

  return `${surface} ${normalizedUnit}`;
};