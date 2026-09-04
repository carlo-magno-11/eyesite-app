export type Property = {
  id: string;
  title: string;
  price: number;
  location: string;
  type: string;
  image?: string;
  images?: string[];
  is_featured?: boolean;
  featured?: boolean;
  destacada?: boolean;
  [key: string]: any;
};

export const PROPERTY_TYPES = ['Casa', 'Departamento', 'Terreno', 'Local', 'Oficina'] as const;
export type PropertyType = typeof PROPERTY_TYPES_OPTIONS[number];

export const PROPERTIES: Property[] = [];

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