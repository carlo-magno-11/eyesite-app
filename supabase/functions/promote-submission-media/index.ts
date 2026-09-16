import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * EYESITE — promote-submission-media
 *
 * Responsabilidad:
 * - Validar que el llamador sea administrador.
 * - Validar una solicitud existente y pendiente.
 * - Validar que los medios pertenezcan al staging permitido.
 * - Validar MIME y tamaño.
 * - Copiar medios de eyesite-staging -> eyesite-media.
 * - Verificar cada destino.
 *
 * Esta función NO:
 * - aprueba solicitudes
 * - modifica solicitudes
 * - crea propiedades
 * - elimina archivos
 */

const STAGING_BUCKET = "eyesite-staging";
const PUBLIC_BUCKET = "eyesite-media";
const PRIVATE_BUCKET = "eyesite-private";

const MAX_IMAGE_SIZE = 200 * 1024 * 1024;
const MAX_VIDEO_SIZE = 200 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/x-m4v",
  "video/m4v",
]);

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type MediaStatus =
  | "promoted"
  | "reused"
  | "skipped"
  | "error";

type MediaResult = {
  field: string;
  originalPath: string;
  sourcePath?: string;
  publicPath?: string;
  publicUrl?: string;
  status: MediaStatus;
  mimeType?: string;
  size?: number;
  error?: string;
  code?: string;
};

type MetadataSuccess = {
  mimeType?: string;
  size?: number;
};

type MetadataError = {
  error: string;
  mimeType?: string;
  size?: number;
};

type MetadataResult =
  | MetadataSuccess
  | MetadataError;

  function isMetadataError(
  metadata: MetadataResult,
): metadata is MetadataError {
  return "error" in metadata;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers,
  });

const isUrl = (value: string) =>
  /^https?:\/\//i.test(value);

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );

const normalisePath = (value: string) =>
  value.replace(/^\/+/, "");

const hasUnsafePath = (value: string) => {
  if (!value) return true;

  if (value.includes("\0")) return true;
  if (value.includes("?")) return true;
  if (value.includes("#")) return true;

  // Nunca aceptar backslashes.
  if (value.includes("\\")) return true;

  // Evitar traversal.
  const segments = value.split("/");
  if (segments.some((segment) => segment === "." || segment === "..")) {
    return true;
  }

  // Rechazar separadores codificados.
  try {
    const decoded = decodeURIComponent(value);

    if (decoded.includes("\\") || decoded.includes("\0")) {
      return true;
    }

    const decodedSegments = decoded.split("/");
    if (
      decodedSegments.some(
        (segment) => segment === "." || segment === "..",
      )
    ) {
      return true;
    }
  } catch {
    return true;
  }

  return false;
};

const basename = (path: string) =>
  path.split("/").pop() || "media";

const sanitiseFilename = (value: string) =>
  value
    .replace(/[^A-Za-z0-9._-]/g, "_")
    .slice(0, 180) || "media";

/**
 * SHA-256 estable para que los reintentos produzcan
 * exactamente el mismo destino.
 */
async function sha256(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function destinationFor(
  requestId: string,
  sourcePath: string,
) {
  const hash = await sha256(sourcePath);
  const filename = sanitiseFilename(basename(sourcePath));

  return `submissions/${requestId}/assets/${hash}-${filename}`;
}

async function objectMetadata(
  client: ReturnType<typeof createClient>,
  bucket: string,
  path: string,
): Promise<MetadataResult> {
  if (hasUnsafePath(path)) {
    return {
      error: "Ruta de Storage no válida.",
    };
  }

  const slash = path.lastIndexOf("/");

  const folder =
    slash === -1 ? "" : path.slice(0, slash);

  const name =
    slash === -1 ? path : path.slice(slash + 1);

  if (!name) {
    return {
      error: "Nombre de archivo inválido.",
    };
  }

  const { data, error } = await client.storage
    .from(bucket)
    .list(folder, {
      search: name,
      limit: 100,
    });

  if (error) {
    return {
      error: error.message,
    };
  }

  const object = (data ?? []).find(
  (entry: { name: string }) => entry.name === name,
);

  if (!object) {
    return {
      error: "No se encontró el objeto en Storage.",
    };
  }

  const metadata = object.metadata ?? {};

  const mimeType =
    typeof metadata.mimetype === "string"
      ? metadata.mimetype.toLowerCase()
      : undefined;

  let size: number | undefined;

  if (typeof metadata.size === "number") {
    size = metadata.size;
  } else if (
    typeof metadata.size === "string" &&
    metadata.size.trim() !== ""
  ) {
    const parsed = Number(metadata.size);
    if (Number.isFinite(parsed)) {
      size = parsed;
    }
  }

  return {
    mimeType,
    size,
  };
}

function validateMediaMetadata(
  field: string,
  metadata: MetadataResult,
): { ok: true } | { ok: false; error: string; code: string } {
  if (isMetadataError(metadata)) {
    return {
      ok: false,
      code: "SOURCE_NOT_FOUND",
      error: metadata.error,
    };
  }

  
  const mimeType = metadata.mimeType;

  if (!mimeType) {
    return {
      ok: false,
      code: "MIME_UNKNOWN",
      error: "No se pudo determinar el tipo MIME del archivo.",
    };
  }

  const isVideo =
    field.toLowerCase().includes("video") ||
    mimeType.startsWith("video/");

  const isImage =
    mimeType.startsWith("image/");

  if (!isImage && !isVideo) {
    return {
      ok: false,
      code: "MIME_NOT_ALLOWED",
      error: `Tipo MIME no permitido: ${mimeType}`,
    };
  }

  if (isVideo && !ALLOWED_VIDEO_TYPES.has(mimeType)) {
    return {
      ok: false,
      code: "MIME_NOT_ALLOWED",
      error: `Video no permitido: ${mimeType}`,
    };
  }

  if (isImage && !ALLOWED_IMAGE_TYPES.has(mimeType)) {
    return {
      ok: false,
      code: "MIME_NOT_ALLOWED",
      error: `Imagen no permitida: ${mimeType}`,
    };
  }

  if (typeof metadata.size !== "number") {
    return {
      ok: false,
      code: "SIZE_UNKNOWN",
      error: "No se pudo determinar el tamaño del archivo.",
    };
  }

  if (metadata.size <= 0) {
    return {
      ok: false,
      code: "INVALID_SIZE",
      error: "El archivo tiene tamaño inválido.",
    };
  }

  const maxSize = isVideo
    ? MAX_VIDEO_SIZE
    : MAX_IMAGE_SIZE;

  if (metadata.size > maxSize) {
    return {
      ok: false,
      code: "FILE_TOO_LARGE",
      error: `El archivo supera el límite permitido de ${maxSize} bytes.`,
    };
  }

  return {
    ok: true,
  };
}

async function promoteOne(
  client: ReturnType<typeof createClient>,
  requestId: string,
  field: string,
  value: unknown,
): Promise<MediaResult | null> {
  if (typeof value !== "string") {
    return null;
  }

  const originalPath = value.trim();

  if (!originalPath) {
    return null;
  }

  /*
   * Las URLs externas no se promocionan.
   *
   * Importante:
   * Una URL de staging NO se considera promocionada.
   * Esto evita que promotion_complete sea true cuando
   * todavía existe un medio privado pendiente de copiar.
   */
  if (isUrl(originalPath)) {
    if (
      originalPath.includes(
        `/storage/v1/object/`,
      ) &&
      originalPath.includes(
        `/${STAGING_BUCKET}/`,
      )
    ) {
      return {
        field,
        originalPath,
        status: "error",
        code: "STAGING_URL_NOT_ALLOWED",
        error:
          "La solicitud contiene una URL de staging. Debe conservar la ruta relativa original.",
      };
    }

    return {
      field,
      originalPath,
      status: "skipped",
      code: "EXTERNAL_URL",
    };
  }

  /*
   * Nunca permitir referencias a archivos privados.
   */
  if (
    originalPath.startsWith(
      `${PRIVATE_BUCKET}/`,
    )
  ) {
    return {
      field,
      originalPath,
      status: "error",
      code: "PRIVATE_MEDIA_REFERENCE",
      error:
        "Una propiedad publicada no puede depender de un archivo privado.",
    };
  }

  /*
   * No aceptamos referencias públicas existentes
   * sin verificar que pertenecen a esta solicitud.
   */
  if (
    originalPath.startsWith(
      `${PUBLIC_BUCKET}/`,
    )
  ) {
    const publicPath = normalisePath(
      originalPath.slice(
        PUBLIC_BUCKET.length + 1,
      ),
    );

    if (
      hasUnsafePath(publicPath) ||
      !publicPath.startsWith(
        `submissions/${requestId}/`,
      )
    ) {
      return {
        field,
        originalPath,
        status: "error",
        code: "PUBLIC_MEDIA_OWNERSHIP",
        error:
          "La referencia pública no pertenece a esta solicitud.",
      };
    }

    const existing = await objectMetadata(
      client,
      PUBLIC_BUCKET,
      publicPath,
    );

    if (isMetadataError(existing)) {
      return {
        field,
        originalPath,
        publicPath,
        status: "error",
        code: "PUBLIC_MEDIA_NOT_FOUND",
        error: existing.error,
      };
    }

    const validation =
      validateMediaMetadata(
        field,
        existing,
      );

    if (!validation.ok) {
      return {
        field,
        originalPath,
        publicPath,
        status: "error",
        mimeType: existing.mimeType,
        size: existing.size,
        code: validation.code,
        error: validation.error,
      };
    }

    return {
      field,
      originalPath,
      publicPath,
      publicUrl: client.storage
        .from(PUBLIC_BUCKET)
        .getPublicUrl(publicPath)
        .data.publicUrl,
      status: "reused",
      mimeType: existing.mimeType,
      size: existing.size,
    };
  }

  /*
   * Normalizamos únicamente la referencia relativa.
   */
  let sourcePath = originalPath;

  const stagingPrefix =
    `${STAGING_BUCKET}/`;

  if (sourcePath.startsWith(stagingPrefix)) {
    sourcePath = sourcePath.slice(
      stagingPrefix.length,
    );
  }

  sourcePath = normalisePath(sourcePath);

  if (hasUnsafePath(sourcePath)) {
    return {
      field,
      originalPath,
      status: "error",
      code: "INVALID_SOURCE_PATH",
      error:
        "La ruta de origen no es válida.",
    };
  }

  /*
   * Todo archivo del staging de EYESITE debe
   * pertenecer a una carpeta de usuario.
   */
  const sourceSegments =
    sourcePath.split("/");

  if (sourceSegments.length < 2) {
    return {
      field,
      originalPath,
      sourcePath,
      status: "error",
      code: "INVALID_SOURCE_PATH",
      error:
        "La ruta de staging no tiene el formato esperado.",
    };
  }

  /*
   * La primera carpeta debe ser el user_id.
   */
  const ownerId = sourceSegments[0];

  if (!isUuid(ownerId)) {
    return {
      field,
      originalPath,
      sourcePath,
      status: "error",
      code: "INVALID_OWNER_PATH",
      error:
        "La ruta de staging no pertenece a un usuario válido.",
    };
  }

  const metadata = await objectMetadata(
    client,
    STAGING_BUCKET,
    sourcePath,
  );

  const validation =
    validateMediaMetadata(
      field,
      metadata,
    );

  if (!validation.ok) {
  return {
    field,
    originalPath,
    sourcePath,
    status: "error",
    mimeType: isMetadataError(metadata)
      ? undefined
      : metadata.mimeType,
    size: isMetadataError(metadata)
      ? undefined
      : metadata.size,
    code: validation.code,
    error: validation.error,
  };
}

  const publicPath =
    await destinationFor(
      requestId,
      sourcePath,
    );

  /*
   * Primero comprobamos si ya existe.
   * Esto hace que los reintentos sean idempotentes.
   */
  const existing =
    await objectMetadata(
      client,
      PUBLIC_BUCKET,
      publicPath,
    );

  if (!isMetadataError(existing)) {
    const existingValidation =
      validateMediaMetadata(
        field,
        existing,
      );

    if (!existingValidation.ok) {
      return {
        field,
        originalPath,
        sourcePath,
        publicPath,
        status: "error",
        mimeType: existing.mimeType,
        size: existing.size,
        code: existingValidation.code,
        error:
          existingValidation.error,
      };
    }

    return {
      field,
      originalPath,
      sourcePath,
      publicPath,
      publicUrl: client.storage
        .from(PUBLIC_BUCKET)
        .getPublicUrl(publicPath)
        .data.publicUrl,
      status: "reused",
      mimeType: existing.mimeType,
      size: existing.size,
    };
  }

  const { error: copyError } =
    await client.storage
      .from(STAGING_BUCKET)
      .copy(
        sourcePath,
        publicPath,
      );

  /*
   * Dos solicitudes simultáneas pueden intentar
   * copiar el mismo archivo. Si la copia falla,
   * comprobamos otra vez el destino antes de
   * declarar error.
   */
  if (copyError) {
    const raceCheck =
      await objectMetadata(
        client,
        PUBLIC_BUCKET,
        publicPath,
      );

    if (!isMetadataError(raceCheck)) {
      const raceValidation =
        validateMediaMetadata(
          field,
          raceCheck,
        );

      if (raceValidation.ok) {
        return {
          field,
          originalPath,
          sourcePath,
          publicPath,
          publicUrl: client.storage
            .from(PUBLIC_BUCKET)
            .getPublicUrl(publicPath)
            .data.publicUrl,
          status: "reused",
          mimeType: raceCheck.mimeType,
          size: raceCheck.size,
        };
      }
    }

    console.error(
      "[promote-submission-media] copy failed",
      {
        sourceBucket: STAGING_BUCKET,
        sourcePath,
        destinationBucket: PUBLIC_BUCKET,
        publicPath,
        mimeType: isMetadataError(metadata) ? undefined : metadata.mimeType,
        size: metadata.size,
        error: copyError.message,
      },
    );

    return {
      field,
      originalPath,
      sourcePath,
      publicPath,
      status: "error",
      mimeType: metadata.mimeType,
      size: metadata.size,
      code: "COPY_FAILED",
      error: copyError.message,
    };
  }

  /*
   * Verificación obligatoria después de copiar.
   */
  const verified =
    await objectMetadata(
      client,
      PUBLIC_BUCKET,
      publicPath,
    );

  if (isMetadataError(verified)) {
    console.error(
      "[promote-submission-media] destination verification failed",
      {
        bucket: PUBLIC_BUCKET,
        path: publicPath,
        error: verified.error,
      },
    );

    return {
      field,
      originalPath,
      sourcePath,
      publicPath,
      status: "error",
      mimeType: metadata.mimeType,
      size: metadata.size,
      code: "DESTINATION_VERIFY_FAILED",
      error: verified.error,
    };
  }

  const finalValidation =
    validateMediaMetadata(
      field,
      verified,
    );

  if (!finalValidation.ok) {
    return {
      field,
      originalPath,
      sourcePath,
      publicPath,
      status: "error",
      mimeType: verified.mimeType,
      size: verified.size,
      code: finalValidation.code,
      error: finalValidation.error,
    };
  }

  return {
    field,
    originalPath,
    sourcePath,
    publicPath,
    publicUrl: client.storage
      .from(PUBLIC_BUCKET)
      .getPublicUrl(publicPath)
      .data.publicUrl,
    status: "promoted",
    mimeType:
      verified.mimeType ??
      metadata.mimeType,
    size:
      verified.size ??
      metadata.size,
  };
}

function mediaValues(
  request: Record<string, unknown>,
) {
  const values: Array<
    [string, unknown]
  > = [];

  for (
    const field of [
      "fotos",
      "fotos_pro",
      "videos",
    ]
  ) {
    const entries = request[field];

    if (Array.isArray(entries)) {
      entries.forEach(
        (entry, index) =>
          values.push([
            `${field}[${index}]`,
            entry,
          ]),
      );
    }
  }

  for (
    const field of [
      "video_url",
      "portada_url",
    ]
  ) {
    if (
      typeof request[field] ===
      "string"
    ) {
      values.push([
        field,
        request[field],
      ]);
    }
  }

  if (
    Array.isArray(
      request.imagenes,
    )
  ) {
    request.imagenes.forEach(
      (entry, index) => {
        if (
          typeof entry ===
          "string"
        ) {
          values.push([
            `imagenes[${index}]`,
            entry,
          ]);
        } else if (
          entry &&
          typeof entry ===
            "object"
        ) {
          const item =
            entry as Record<
              string,
              unknown
            >;

          values.push([
            `imagenes[${index}]`,
            item.path ??
              item.url ??
              item.publicUrl,
          ]);
        }
      },
    );
  }

  return values;
}

Deno.serve(
  async (req: Request) => {
    if (req.method === "OPTIONS") {
      return new Response(
        "ok",
        { headers },
      );
    }

    if (req.method !== "POST") {
      return json(
        {
          error:
            "Método no permitido",
        },
        405,
      );
    }

    const authorization =
      req.headers.get(
        "Authorization",
      );

    if (
      !authorization ||
      !/^Bearer\s+\S+$/i.test(
        authorization,
      )
    ) {
      return json(
        {
          error:
            "No autorizado",
        },
        401,
      );
    }

    const supabaseUrl =
      Deno.env.get(
        "SUPABASE_URL",
      );

    const anonKey =
      Deno.env.get(
        "SUPABASE_ANON_KEY",
      );

    const serviceRoleKey =
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY",
      );

    if (
      !supabaseUrl ||
      !anonKey ||
      !serviceRoleKey
    ) {
      return json(
        {
          error:
            "Configuración incompleta",
        },
        500,
      );
    }

    try {
      const body =
        await req.json();

      if (
        !body ||
        typeof body !==
          "object"
      ) {
        return json(
          {
            error:
              "JSON inválido",
          },
          400,
        );
      }

      const requestId =
        typeof body.request_id ===
        "string"
          ? body.request_id.trim()
          : "";

      if (!requestId) {
        return json(
          {
            error:
              "request_id es obligatorio",
            code:
              "REQUEST_ID_REQUIRED",
          },
          400,
        );
      }

      if (!isUuid(requestId)) {
        return json(
          {
            error:
              "request_id no tiene un UUID válido",
            code:
              "INVALID_REQUEST_ID",
          },
          400,
        );
      }

      /*
       * Cliente con el JWT del administrador.
       */
      const caller =
        createClient(
          supabaseUrl,
          anonKey,
          {
            global: {
              headers: {
                Authorization:
                  authorization,
              },
            },
          },
        );

      const {
        data: {
          user,
        },
        error:
          userError,
      } =
        await caller.auth.getUser();

      if (
        userError ||
        !user
      ) {
        return json(
          {
            error:
              "Sesión inválida",
            code:
              "INVALID_SESSION",
          },
          401,
        );
      }

      /*
       * Cliente privilegiado exclusivamente dentro
       * de la Edge Function.
       */
      const admin =
        createClient(
          supabaseUrl,
          serviceRoleKey,
        );

      const {
        data: profile,
        error:
          profileError,
      } =
        await admin
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

      if (
        profileError
      ) {
        console.error(
          "[promote-submission-media] profile lookup failed",
          profileError.message,
        );

        return json(
          {
            error:
              "No se pudo validar el rol",
            code:
              "ROLE_LOOKUP_FAILED",
          },
          500,
        );
      }

      if (
        profile?.role !==
        "admin"
      ) {
        return json(
          {
            error:
              "Solo administradores",
            code:
              "ADMIN_REQUIRED",
          },
          403,
        );
      }

      const {
        data: submission,
        error:
          submissionError,
      } =
        await admin
          .from(
            "solicitudes_propiedades",
          )
          .select(
            "id, estado, fotos, fotos_pro, videos, video_url, portada_url, imagenes",
          )
          .eq(
            "id",
            requestId,
          )
          .maybeSingle();

      if (
        submissionError
      ) {
        console.error(
          "[promote-submission-media] submission lookup failed",
          submissionError.message,
        );

        return json(
          {
            error:
              "No se pudo leer la solicitud",
            code:
              "SUBMISSION_LOOKUP_FAILED",
          },
          500,
        );
      }

      if (!submission) {
        return json(
          {
            error:
              "Solicitud no encontrada",
            code:
              "SUBMISSION_NOT_FOUND",
          },
          404,
        );
      }

      /*
       * Solo se pueden promocionar solicitudes
       * pendientes. No debemos permitir promocionar
       * una solicitud ya aprobada/rechazada.
       */
      if (
        submission.estado !==
        "pendiente"
      ) {
        return json(
          {
            error:
              "La solicitud no está pendiente.",
            code:
              "SUBMISSION_NOT_PENDING",
            estado:
              submission.estado,
          },
          409,
        );
      }

      const media =
        mediaValues(
          submission as Record<
            string,
            unknown
          >,
        );

      /*
       * Una solicitud sin medios no debe considerarse
       * una promoción exitosa.
       */
      if (
        media.length === 0
      ) {
        return json(
          {
            request_id:
              requestId,
            approved:
              false,
            promotion_complete:
              false,
            results: [],
            errors: [
              {
                code:
                  "NO_MEDIA",
                error:
                  "La solicitud no contiene medios para promocionar.",
              },
            ],
            public_media: [],
          },
          422,
        );
      }

      const rawResults =
        await Promise.all(
          media.map(
            ([field, value]) =>
              promoteOne(
                admin,
                requestId,
                field,
                value,
              ),
          ),
        );

      const results =
        rawResults.filter(
          Boolean,
        ) as MediaResult[];

      /*
       * skipped NO significa éxito.
       * Solamente promoted/reused cuentan como
       * medios correctamente publicados.
       */
      const errors =
        results.filter(
          (item) =>
            item.status ===
              "error" ||
            item.status ===
              "skipped",
        );

      const publicMedia =
        results
          .filter(
            (item) =>
              Boolean(
                item.publicUrl,
              ) &&
              (item.status ===
                "promoted" ||
                item.status ===
                  "reused"),
          )
          .map(
            ({
              field,
              originalPath,
              sourcePath,
              publicPath,
              publicUrl,
              mimeType,
              size,
            }) => ({
              field,
              originalPath,
              sourcePath,
              publicPath,
              publicUrl,
              mimeType,
              size,
            }),
          );

      const promotionComplete =
        errors.length === 0 &&
        publicMedia.length ===
          results.length &&
        results.length > 0;

      return json(
        {
          request_id:
            requestId,
          approved:
            false,
          promotion_complete:
            promotionComplete,
          results,
          errors,
          public_media:
            publicMedia,
        },
        promotionComplete
          ? 200
          : 422,
      );
    } catch (error) {
      console.error(
        "[promote-submission-media] unexpected error",
        {
          error:
            error instanceof Error
              ? error.message
              : String(error),
        },
      );

      return json(
        {
          error:
            "No se pudo promover los medios",
          code:
            "UNEXPECTED_ERROR",
        },
        500,
      );
    }
  },
);