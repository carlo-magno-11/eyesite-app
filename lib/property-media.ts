const SUPABASE_URL =
  'https://xhvpvpvtkdgnnxdwdrkn.supabase.co';

export const PUBLIC_MEDIA_BUCKET =
  'eyesite-media';

const PUBLIC_MEDIA_BASE =
  `${SUPABASE_URL}/storage/v1/object/public/${PUBLIC_MEDIA_BUCKET}`;

const VIDEO_EXTENSIONS =
  /\.(mp4|webm|mov|m4v)(\?.*)?$/i;

/**
 * Convierte cualquier referencia de media
 * guardada por EYESITE en una URL utilizable
 * por la aplicación.
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

  // URL completa.
  if (
    input.startsWith('http://') ||
    input.startsWith('https://')
  ) {
    return input;
  }

  // Ruta /storage/v1/object/public/...
  if (
    input.startsWith(
      '/storage/v1/object/public/'
    )
  ) {
    return `${SUPABASE_URL}${input}`;
  }

  // Ruta que ya contiene el bucket.
  if (
    input.startsWith(
      `${PUBLIC_MEDIA_BUCKET}/`
    )
  ) {
    return `${SUPABASE_URL}/storage/v1/object/public/${input}`;
  }

  // Ruta relativa dentro de eyesite-media.
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