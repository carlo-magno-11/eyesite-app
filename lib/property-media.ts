const SUPABASE_URL =
  'https://xhvpvpvtkdgnnxdwdrkn.supabase.co';

export const PUBLIC_MEDIA_BUCKET =
  'eyesite-media';

const PUBLIC_MEDIA_BASE =
  `${SUPABASE_URL}/storage/v1/object/public/${PUBLIC_MEDIA_BUCKET}`;

const VIDEO_EXTENSIONS =
  /\.(mp4|webm|mov|m4v)(\?.*)?$/i;

const USER_STORAGE_PATH =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\//i;

/**
 * Convierte una referencia de media publicada
 * en una URL utilizable por la aplicación.
 *
 * Las rutas relativas antiguas pertenecientes a
 * usuarios no son públicas por contrato: normalmente
 * proceden de staging/private y deben ser promovidas
 * antes de llegar al catálogo público.
 */
export function normalizeMediaUrl(
  value: unknown
): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const input = value.trim();

  if (!input) {
    return null;
  }

  // URL completa. Nunca aceptamos como media pública
  // una URL de los buckets privados/de staging de EYESITE.
  if (
    input.startsWith('http://') ||
    input.startsWith('https://')
  ) {
    const normalizedHttpUrl = input.toLowerCase();

    if (
      normalizedHttpUrl.includes('/storage/v1/object/public/eyesite-staging/') ||
      normalizedHttpUrl.includes('/storage/v1/object/public/eyesite-private/') ||
      normalizedHttpUrl.includes('/storage/v1/object/sign/eyesite-staging/') ||
      normalizedHttpUrl.includes('/storage/v1/object/sign/eyesite-private/')
    ) {
      return null;
    }

    return input;
  }

  // Ruta /storage/v1/object/public/...
  // Validamos el bucket antes de aceptar la URL.
  if (
    input.startsWith(
      '/storage/v1/object/public/'
    )
  ) {
    const publicStoragePath =
      input.slice('/storage/v1/object/public/'.length);

    const normalizedStoragePath =
      publicStoragePath.toLowerCase();

    if (
      normalizedStoragePath.startsWith('eyesite-staging/') ||
      normalizedStoragePath.startsWith('eyesite-private/')
    ) {
      return null;
    }

    return `${SUPABASE_URL}${input}`;
  }

  // Nunca convertir una ruta privada o de staging en una
  // URL pública. Si una propiedad todavía contiene una
  // referencia antigua a estos buckets, se omite hasta
  // que el medio sea promovido correctamente.
  if (
    input.startsWith('eyesite-staging/') ||
    input.startsWith('eyesite-private/')
  ) {
    return null;
  }

  // Una ruta relativa que comienza por un UUID de usuario
  // es una referencia típica de staging y NO debe
  // reinterpretarse como un objeto público.
  if (USER_STORAGE_PATH.test(input)) {
    return null;
  }

  // Ruta que ya contiene el bucket público definitivo.
  if (
    input.startsWith(
      `${PUBLIC_MEDIA_BUCKET}/`
    )
  ) {
    return `${SUPABASE_URL}/storage/v1/object/public/${input}`;
  }

  // Rutas relativas públicas heredadas se mantienen
  // compatibles, pero solo si no parecen referencias
  // de almacenamiento de usuario.
  return `${PUBLIC_MEDIA_BASE}/${input.replace(/^\/+/, '')}`;
}

/**
 * Extrae la URL de un elemento de media.
 */
export function normalizeMediaItem(
  item: unknown
): string | null {
  if (typeof item === 'string') {
    return normalizeMediaUrl(item);
  }

  if (
    item &&
    typeof item === 'object'
  ) {
    const value =
      item as Record<string, unknown>;

    return normalizeMediaUrl(
      value.url ??
        value.uri ??
        value.publicUrl ??
        value.public_url ??
        value.path ??
        value.filePath ??
        value.storagePath
    );
  }

  return null;
}

/**
 * Normaliza arrays de media.
 */
export function normalizeMediaArray(
  value: unknown
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(normalizeMediaItem)
    .filter(
      (url): url is string =>
        Boolean(url)
    );
}

/**
 * Determina si una referencia corresponde
 * a un video.
 */
export function isVideoUri(
  value: unknown
): boolean {
  if (typeof value !== 'string') {
    return false;
  }

  const input = value.trim();

  if (!input) {
    return false;
  }

  return (
    input.includes('/videos/') ||
    VIDEO_EXTENSIONS.test(input)
  );
}

/**
 * Obtiene la primera imagen válida.
 *
 * Si portada_url contiene realmente un video,
 * se ignora como portada y se busca una foto.
 */
export function getFirstImage(
  fotos: unknown,
  portada?: unknown
): string | null {
  const portadaUrl =
    normalizeMediaUrl(portada);

  if (
    portadaUrl &&
    !isVideoUri(portadaUrl)
  ) {
    return portadaUrl;
  }

  const images =
    normalizeMediaArray(fotos);

  return images.find(
    (url) => !isVideoUri(url)
  ) ?? null;
}
