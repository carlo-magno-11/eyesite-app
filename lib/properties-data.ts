export type Property = {
  id: string;
  title: string;
  price: number;
  location: string;
  type: string;
  image?: string;
  images?: string[];
  videos?: string[];
  tipo_portada?: 'foto' | 'video';
  video_url?: string;
  portada_url?: string;
  is_featured?: boolean;
  featured?: boolean;
  destacada?: boolean;
  [key: string]: any;
};

export const PROPERTY_TYPES = ['Casa', 'Departamento', 'Terreno', 'Local', 'Oficina'] as const;
export type PropertyType = typeof PROPERTY_TYPES_OPTIONS[number];

export const PROPERTIES: Property[] = [];

/**
 * MOCK_DATA: propiedades de ejemplo para que la app siga funcionando
 * (nunca pantalla en blanco) cuando Supabase no responde o falla.
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
      'Terreno residencial en la zona de mayor plusvalía de Mérida, a 5 minutos de nucleos comerciales y colegios. Documentación en regla, lista para escriturar.',
    descripcion:
      'Terreno residencial en la zona de mayor plusvalía de Mérida, a 5 minutos de nucleos comerciales y colegios. Documentación en regla, lista para escriturar.',
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
      'Hacienda campestre con casa principal restaurada, pozo y arboleda. Ideal para proyecto ecoturístico cerca de la zona puuc.',
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
      'Terreno comercial sobre anillo periférico con frente de 45 metros, uso de suelo comercial aprobado y acceso a servicios.',
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
      'Rancho ganadero con corrales, abrevaderos y pasto introducido. Contiguo a carretera estatal, ideal para ganado mayor.',
  },
];

export const getReturnColor = (value: number) => {
  if (value >= 15) return 'green';
  if (value >= 8) return 'yellow';
  return 'red';
};

export const useSubmitProperty = () => {
  return { submitProperty: async (data: any) => ({ success: true }), loading: false, submitting: false };
};
export const PROPERTY_TYPES_OPTIONS = PROPERTY_TYPES.map(t => ({ key: t, label: t, value: t }));

export const formatPrice = (price: number, _currency?: string) => {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(price);
};

export const formatSurface = (surface: number, _unit?: string) => {
  return `${surface} m²`;
};