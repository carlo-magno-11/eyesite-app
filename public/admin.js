/* ============================================================
   EYESITE — ADMIN.JS
   Panel de administración
   ============================================================ */

"use strict";

/* ============================================================
   CONFIGURACIÓN
   ============================================================ */

const ADMIN_EMAIL = "carlopiste@gmail.com";

const TABLE_PROFILES = "profiles";
const TABLE_PROPERTIES = "propiedades";
const TABLE_PROPERTIES_VIEW = "propiedades_admin";
const TABLE_SUBMISSIONS = "solicitudes_propiedades";

const BUCKET_IMAGES = "eyesite-media";
const BUCKET_FILES = 'eyesite-private';

/* ============================================================
   ESTADO
   ============================================================ */

let propiedades = [];
let pendientes = [];
let usuarios = [];

let propiedadEditando = null;
let pendienteViendo = null;

let nuevasImagenes = [];
let nuevosArchivos = [];
let nuevosEnlaces = [];
let nuevasFotosPro = [];
let nuevosVideos = [];
let nuevaPortadaVideo = null;

let editImagenes = [];
let editArchivos = [];
let editEnlaces = [];
let editFotosPro = [];
let editVideos = [];
let editPortadaVideo = null;

let currentUser = null;

let toastTimer = null;
let confirmCallback = null;

/* ============================================================
   MAPA DE UBICACIÓN DE PROPIEDAD
   ============================================================ */

let adminPropertyMap = null;
let adminPropertyMarker = null;
let adminPropertyMapMode = null;

const ADMIN_DEFAULT_LAT = 20.9674;
const ADMIN_DEFAULT_LNG = -89.5926;


/* ============================================================
   OBTENER COORDENADAS
   ============================================================ */

function getAdminPropertyCoordinates(mode = "new") {
  const latElement = document.getElementById(`${mode}_latitud`);
  const lngElement = document.getElementById(`${mode}_longitud`);

  const lat = latElement ? Number(latElement.value) : NaN;
  const lng = lngElement ? Number(lngElement.value) : NaN;

  const validLat =
    Number.isFinite(lat) &&
    lat >= -90 &&
    lat <= 90 &&
    lat !== 0;

  const validLng =
    Number.isFinite(lng) &&
    lng >= -180 &&
    lng <= 180 &&
    lng !== 0;

  return {
    latitud: validLat ? lat : null,
    longitud: validLng ? lng : null,
  };
}


/* ============================================================
   ACTUALIZAR COORDENADAS
   ============================================================ */

function updateAdminPropertyCoordinates(mode, lat, lng) {
  const parsedLat = Number(lat);
  const parsedLng = Number(lng);

  if (
    !Number.isFinite(parsedLat) ||
    !Number.isFinite(parsedLng)
  ) {
    return;
  }

  const latInput = document.getElementById(`${mode}_latitud`);
  const lngInput = document.getElementById(`${mode}_longitud`);

  if (latInput) {
    latInput.value = parsedLat.toFixed(8);
  }

  if (lngInput) {
    lngInput.value = parsedLng.toFixed(8);
  }

  const coordinates = document.getElementById(
    `${mode}_adminPropertyCoordinates`
  );

  if (coordinates) {
    coordinates.textContent =
      "Coordenadas: " +
      parsedLat.toFixed(6) +
      ", " +
      parsedLng.toFixed(6);
  }
}


/* ============================================================
   COLOCAR / MOVER MARCADOR
   ============================================================ */

function setAdminPropertyMarker(
  mode,
  lat,
  lng,
  centerMap = true
) {
  const parsedLat = Number(lat);
  const parsedLng = Number(lng);

  if (
    !Number.isFinite(parsedLat) ||
    !Number.isFinite(parsedLng)
  ) {
    return;
  }

  if (!adminPropertyMap) {
    return;
  }

  if (adminPropertyMarker) {
    adminPropertyMarker.setLatLng([
      parsedLat,
      parsedLng,
    ]);
  } else {
    adminPropertyMarker = L.marker(
      [
        parsedLat,
        parsedLng,
      ],
      {
        draggable: true,
      }
    ).addTo(adminPropertyMap);

    adminPropertyMarker.on(
      "dragend",
      function (event) {
        if (!event || !event.target) {
          return;
        }

        const position =
          event.target.getLatLng();

        if (!position) {
          return;
        }

        updateAdminPropertyCoordinates(
          mode,
          position.lat,
          position.lng
        );
      }
    );
  }

  updateAdminPropertyCoordinates(
    mode,
    parsedLat,
    parsedLng
  );

  if (centerMap) {
    adminPropertyMap.setView(
      [
        parsedLat,
        parsedLng,
      ],
      15
    );
  }
}


/* ============================================================
   INICIALIZAR MAPA
   ============================================================ */

function initAdminPropertyMap(
  lat = null,
  lng = null,
  mode = "new"
) {
  const mapId =
    `${mode}_adminPropertyMap`;

  const mapElement =
    document.getElementById(mapId);

  if (!mapElement) {
    console.warn(
      "[admin map] No existe:",
      mapId
    );

    return false;
  }

  if (typeof L === "undefined") {
    console.error(
      "[admin map] Leaflet no está cargado."
    );

    return false;
  }

  const parsedLat = Number(lat);
  const parsedLng = Number(lng);

  const validCoordinates =
    Number.isFinite(parsedLat) &&
    Number.isFinite(parsedLng) &&
    parsedLat !== 0 &&
    parsedLng !== 0 &&
    parsedLat >= -90 &&
    parsedLat <= 90 &&
    parsedLng >= -180 &&
    parsedLng <= 180;

  const initialLat =
    validCoordinates
      ? parsedLat
      : ADMIN_DEFAULT_LAT;

  const initialLng =
    validCoordinates
      ? parsedLng
      : ADMIN_DEFAULT_LNG;

  /* ----------------------------------------------------------
     ELIMINAR MAPA ANTERIOR
     ---------------------------------------------------------- */

  if (adminPropertyMap) {
    try {
      adminPropertyMap.remove();
    } catch (error) {
      console.warn(
        "[admin map] Error eliminando mapa anterior:",
        error
      );
    }

    adminPropertyMap = null;
    adminPropertyMarker = null;
  }

  adminPropertyMapMode = mode;

  /* ----------------------------------------------------------
     CREAR MAPA
     ---------------------------------------------------------- */

  try {
    adminPropertyMap =
      L.map(
        mapElement,
        {
          zoomControl: true,
          attributionControl: true,
        }
      );

    adminPropertyMap.setView(
      [
        initialLat,
        initialLng,
      ],
      validCoordinates ? 15 : 11
    );

    /* --------------------------------------------------------
       OPEN STREET MAP
       -------------------------------------------------------- */

    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        attribution:
          "&copy; OpenStreetMap contributors",
      }
    ).addTo(
      adminPropertyMap
    );

    /* --------------------------------------------------------
       CLICK EN MAPA
       -------------------------------------------------------- */

    adminPropertyMap.on(
      "click",
      function (event) {
        if (!event || !event.latlng) {
          return;
        }

        setAdminPropertyMarker(
          mode,
          event.latlng.lat,
          event.latlng.lng,
          true
        );
      }
    );

    /* --------------------------------------------------------
       MARCADOR EXISTENTE
       -------------------------------------------------------- */

    if (validCoordinates) {
      setAdminPropertyMarker(
        mode,
        initialLat,
        initialLng,
        false
      );
    }

    /* --------------------------------------------------------
       CORREGIR TAMAÑO
       -------------------------------------------------------- */

    setTimeout(
      function () {
        if (adminPropertyMap) {
          adminPropertyMap.invalidateSize();
        }
      },
      300
    );

    console.log(
      "[admin map] Mapa inicializado:",
      mode
    );

    return true;

  } catch (error) {
    console.error(
      "[admin map] Error inicializando mapa:",
      error
    );

    adminPropertyMap = null;
    adminPropertyMarker = null;

    return false;
  }
}

/* ============================================================
   INICIAR OBSERVACIÓN DEL MAPA
   ============================================================ */

/* ============================================================
   UTILIDADES
   ============================================================ */

function esc(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeHtml(value) {
  return esc(value);
}

function money(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const n = Number(String(value).replace(/[^\d.-]/g, ""));

  if (Number.isNaN(n)) {
    return esc(value);
  }

  return "$" + n.toLocaleString("es-MX");
}

function percent(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const n = Number(value);

  if (Number.isNaN(n)) {
    return esc(value);
  }

  return `${n}%`;
}

function dateMX(value) {
  if (!value) {
    return "—";
  }

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) {
    return "—";
  }

  return d.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function dateTimeMX(value) {
  if (!value) {
    return "—";
  }

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) {
    return "—";
  }

  return d.toLocaleString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatearFecha(fecha) {
  return dateMX(fecha);
}

function normalizeStatus(status) {
  const value = String(status || "")
    .toLowerCase()
    .trim();

  if (
    value === "activa" ||
    value === "activo" ||
    value === "active" ||
    value === "aprobado" ||
    value === "aprobada" ||
    value === "approved" ||
    value === "publicado" ||
    value === "publicada"
  ) {
    return "activa";
  }

  if (value === "inactiva" || value === "inactivo" || value === "inactive") {
    return "inactiva";
  }

  if (value === "rechazado" || value === "rechazada" || value === "rejected") {
    return "rechazado";
  }

  if (
    value === "suspendida" ||
    value === "suspendido" ||
    value === "suspended"
  ) {
    return "suspendida";
  }

  if (value === "aprobacion" || value === "pendiente") {
    return "pendiente";
  }

  return "pendiente";
}

function statusBadge(status) {
  const statusNormalizado = normalizeStatus(status);

  if (statusNormalizado === "activa") {
    return `
      <span class="badge bg2">
        ACTIVA
      </span>
    `;
  }

  if (statusNormalizado === "inactiva") {
    return `
      <span class="badge br2">
        INACTIVA
      </span>
    `;
  }

  if (statusNormalizado === "rechazado") {
    return `
      <span class="badge br2">
        RECHAZADO
      </span>
    `;
  }

  if (statusNormalizado === "suspendida") {
    return `
      <span class="badge brj2">
        SUSPENDIDA
      </span>
    `;
  }

  return `
    <span class="badge ba2">
      PENDIENTE
    </span>
  `;
}

function typeBadge(tipo) {
  if (!tipo) {
    return "—";
  }

  return `
    <span class="badge bb2">
      ${esc(tipo)}
    </span>
  `;
}

function getPropTitle(p) {
  if (!p) {
    return "Sin título";
  }

  return p.titulo || p.title || p.nombre || p.name || "Sin título";
}

function getPropType(p) {
  if (!p) {
    return "—";
  }

  return p.tipo || p.type || p.property_type || "—";
}

function getMunicipio(p) {
  if (!p) {
    return "—";
  }

  return p.municipio || p.ciudad || p.city || p.zona || "—";
}

function getPrecio(p) {
  if (!p) {
    return null;
  }

  return p.precio ?? p.price ?? p.valor ?? null;
}

function getRendimiento(p) {
  if (!p) {
    return null;
  }

  return p.rendimiento ?? p.rendimiento_anual ?? p.roi ?? p.performance ?? null;
}

function getImages(p) {
  if (!p) {
    return [];
  }

  let imgs = p.imagenes ?? p.images ?? p.fotos ?? p.photos ?? [];

  if (!Array.isArray(imgs)) {
    try {
      imgs = JSON.parse(imgs);
    } catch {
      imgs = [];
    }
  }

  return Array.isArray(imgs) ? imgs : [];
}

function getMainImage(p) {
  const imgs = getImages(p);

  if (!imgs.length) {
    return "";
  }

  const main = imgs.find((item) => {
    return (
      item &&
      typeof item === "object" &&
      (item.principal === true || item.main === true || item.is_main === true)
    );
  });

  if (main) {
    return main.url || main.publicUrl || "";
  }

  const first = imgs[0];

  if (typeof first === "string") {
    return first;
  }

  return first?.url || first?.publicUrl || "";
}

function getUserId(p) {
  if (!p) {
    return null;
  }

  return p.usuario_id || p.user_id || p.owner_id || p.profile_id || null;
}

function getUserEmail(p) {
  if (!p) {
    return "—";
  }

  return p.email || p.usuario_email || p.user_email || "—";
}

function normalizeArray(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  try {
    const parsed = JSON.parse(value);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function emptyRow(cols, icon, title, text = "") {
  return `
    <tr>
      <td colspan="${cols}">
        <div class="empty2">
          <div class="emi">
            ${esc(icon)}
          </div>

          <div class="emt">
            ${esc(title)}
          </div>

          ${text ? `<div>${esc(text)}</div>` : ""}
        </div>
      </td>
    </tr>
  `;
}

function valueOf(id) {
  const element = document.getElementById(id);

  return element ? element.value.trim() : "";
}

function formatBytes(bytes) {
  if (!bytes) {
    return "";
  }

  const units = ["B", "KB", "MB", "GB"];

  let i = 0;
  let size = bytes;

  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }

  return `${size.toFixed(i ? 1 : 0)} ${units[i]}`;
}

/* ============================================================
   TOAST
   ============================================================ */

function toast(message) {
  const element = document.getElementById("toast");

  if (!element) {
    return;
  }

  element.textContent = String(message || "");

  element.classList.add("on");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    element.classList.remove("on");
  }, 3000);
}

/* ============================================================
   CONFIRMACIÓN
   ============================================================ */

function confirmar(titulo, texto, callback) {
  const cov = document.getElementById("cov");

  const ctit = document.getElementById("ctit");

  const csub = document.getElementById("csub");

  const cok = document.getElementById("cok");

  if (!cov || !ctit || !csub || !cok) {
    return;
  }

  ctit.textContent = titulo || "";

  csub.textContent = texto || "";

  confirmCallback = callback;

  cok.onclick = async () => {
    const callbackActual = confirmCallback;

    closeCon();

    if (typeof callbackActual === "function") {
      try {
        await callbackActual();
      } catch (error) {
        console.error("[confirmación]", error);

        toast(error?.message || "Ocurrió un error.");
      }
    }
  };

  cov.classList.add("on");
}

function closeCon() {
  const cov = document.getElementById("cov");

  if (cov) {
    cov.classList.remove("on");
  }

  confirmCallback = null;
}

/* ============================================================
   MODALES
   ============================================================ */

function openMod(id) {
  const element = document.getElementById(id);

  if (element) {
    element.classList.add("on");
  }
}

function closeMod(id) {
  const element = document.getElementById(id);

  if (element) {
    element.classList.remove("on");
  }
}

/* ============================================================
   NAVEGACIÓN
   ============================================================ */

const sectionInfo = {
  dashboard: {
    title: "Dashboard",
    subtitle: "Resumen general",
  },

  propiedades: {
    title: "Propiedades",
    subtitle: "Administra las propiedades de la plataforma",
  },

  pendientes: {
    title: "Por aprobar",
    subtitle: "Revisa las solicitudes pendientes",
  },

  nueva: {
    title: "Nueva propiedad",
    subtitle: "Publica una nueva propiedad",
  },

  usuarios: {
    title: "Usuarios",
    subtitle: "Gestiona los usuarios de la plataforma",
  },
};

function goTo(section) {
  document.querySelectorAll(".ni").forEach((item) => {
    item.classList.toggle("on", item.dataset.s === section);
  });

  document.querySelectorAll(".sec").forEach((item) => {
    item.classList.remove("on");
  });

  const target = document.getElementById(`sec-${section}`);

  if (target) {
    target.classList.add("on");
  }

  const info = sectionInfo[section] || {};

  const title = document.getElementById("tbt");

  const subtitle = document.getElementById("tbs");

  if (title) {
    title.textContent = info.title || section;
  }

  if (subtitle) {
    subtitle.textContent = info.subtitle || "";
  }

  if (section === "dashboard") {
    cargarDashboard();
  }

  if (section === "propiedades") {
    renderPropiedades();
  }

  if (section === "pendientes") {
    renderPendientes();
  }

  if (section === "usuarios") {
    cargarUsuarios();
  }

  if (section === "nueva") {
  const marker =
    document.getElementById("newFormReady");

  if (!marker) {
    buildNewForm();
  }

  setTimeout(() => {
    const latElement =
      document.getElementById("new_latitud");

    const lngElement =
      document.getElementById("new_longitud");

    const lat =
      latElement
        ? Number(latElement.value)
        : null;

    const lng =
      lngElement
        ? Number(lngElement.value)
        : null;

    initAdminPropertyMap(
      lat,
      lng,
      "new"
    );
    }, 100);
  }
}

/* ============================================================
   AUTENTICACIÓN
   ============================================================ */

async function checkAdmin() {
  try {
    const { data, error } = await s.auth.getSession();

    if (error) {
      throw error;
    }

    const session = data?.session;

    if (!session || !session.user) {
      location.replace("./admin_seguro.html");

      return false;
    }

    currentUser = session.user;

    const email = String(session.user.email || "").toLowerCase();

    if (email !== ADMIN_EMAIL.toLowerCase()) {
      await s.auth.signOut();

      location.replace("./admin_seguro.html");

      return false;
    }

    const fa = localStorage.getItem("admin_2fa_ok");

    if (!fa) {
      location.replace("./admin_seguro.html");

      return false;
    }

    const timestamp = parseInt(fa, 10);

    if (!Number.isFinite(timestamp) || Date.now() - timestamp > 7200000) {
      localStorage.removeItem("admin_2fa_ok");

      location.replace("./admin_seguro.html");

      return false;
    }

    const { data: aal, error: aalError } =
      await s.auth.mfa.getAuthenticatorAssuranceLevel();

    if (aalError) {
      throw aalError;
    }

    if (!aal || aal.currentLevel !== "aal2") {
      localStorage.removeItem("admin_2fa_ok");

      location.replace("./admin_seguro.html");

      return false;
    }

    const ue = document.getElementById("ue");

    if (ue) {
      ue.textContent = session.user.email || "Administrador";
    }

    const lw = document.getElementById("lw");

    if (lw) {
      lw.style.display = "none";
    }

    const app = document.getElementById("app");

    if (app) {
      app.classList.add("on");
    }

    return true;
  } catch (error) {
    console.error("[auth]", error);

    location.replace("./admin_seguro.html");

    return false;
  }
}

async function doLogin() {
  const email = document.getElementById("le")?.value.trim();

  const password = document.getElementById("lp")?.value || "";

  const errorElement = document.getElementById("lerr");

  if (errorElement) {
    errorElement.textContent = "";
  }

  if (!email || !password) {
    if (errorElement) {
      errorElement.textContent = "Ingresa correo y contraseña.";
    }

    return;
  }

  try {
    const { data, error } = await s.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    currentUser = data?.user || null;

    localStorage.setItem("admin_2fa_ok", String(Date.now()));

    const { data: aal, error: aalError } =
      await s.auth.mfa.getAuthenticatorAssuranceLevel();

    if (aalError) {
      throw aalError;
    }

    if (aal?.currentLevel !== "aal2") {
      location.replace("./admin_seguro.html");

      return;
    }

    location.replace("./admin.html");
  } catch (error) {
    console.error("[login]", error);

    if (errorElement) {
      errorElement.textContent = error?.message || "No se pudo iniciar sesión.";
    }
  }
}

async function cerrarSesion() {
  try {
    await s.auth.signOut();
  } catch (error) {
    console.error("[logout]", error);
  }

  localStorage.removeItem("admin_2fa_ok");

  location.href = "./admin_seguro.html";
}

/* ============================================================
   PROPIEDADES — CARGAR
   ============================================================ */

async function cargarPropiedades() {
  try {
    const { data, error } = await s
      .from(TABLE_PROPERTIES_VIEW)
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      throw error;
    }

    propiedades = Array.isArray(data) ? data : [];

    return propiedades;
  } catch (error) {
    console.error("[properties]", error);

    propiedades = [];

    toast(error?.message || "No se pudieron cargar las propiedades.");

    return [];
  }
}

/* ============================================================
   DASHBOARD
   ============================================================ */

async function cargarDashboard() {
  if (!propiedades.length) {
    await cargarPropiedades();
  }

  const activos = propiedades.filter((p) => {
    return normalizeStatus(p.estado || p.status) === "activa";
  });

  const pend = propiedades.filter((p) => {
    return normalizeStatus(p.estado || p.status) === "pendiente";
  });

  const tipos = new Set(
    propiedades.map(getPropType).filter((type) => type && type !== "—"),
  );

  const rendimientos = activos
    .map((p) => Number(getRendimiento(p)))
    .filter((value) => Number.isFinite(value));

  const promedio = rendimientos.length
    ? rendimientos.reduce((a, b) => a + b, 0) / rendimientos.length
    : 0;

  const st = document.getElementById("st");

  const sp = document.getElementById("sp");

  const stip = document.getElementById("stip");

  const savg = document.getElementById("savg");

  if (st) {
    st.textContent = activos.length;
  }

  if (sp) {
    sp.textContent = pend.length;
  }

  if (stip) {
    stip.textContent = tipos.size;
  }

  if (savg) {
    savg.textContent = `${promedio.toFixed(1)}%`;
  }

  renderDashboard(activos);

  actualizarBadgePendientes(pend.length);
}

function renderDashboard(activos) {
  const tbody = document.getElementById("dtb");

  if (!tbody) {
    return;
  }

  const recientes = [...activos]
    .sort((a, b) => {
      return (
        new Date(b.created_at || b.fecha || 0) -
        new Date(a.created_at || a.fecha || 0)
      );
    })
    .slice(0, 8);

  if (!recientes.length) {
    tbody.innerHTML = emptyRow(6, "🏠", "No hay propiedades activas");

    return;
  }

  tbody.innerHTML = recientes
    .map(
      (p) => `
      <tr>

        <td class="p">
          ${esc(getPropTitle(p))}
        </td>

        <td>
          ${typeBadge(getPropType(p))}
        </td>

        <td>
          ${esc(getMunicipio(p))}
        </td>

        <td class="p">
          ${money(getPrecio(p))}
        </td>

        <td>
          ${percent(getRendimiento(p))}
        </td>

        <td>
          ${statusBadge(p.estado || p.status)}
        </td>

      </tr>
    `,
    )
    .join("");
}

/* ============================================================
   TABLA PROPIEDADES
   ============================================================ */

function renderPropiedades(list = propiedades) {
  const tbody = document.getElementById("ptb");

  if (!tbody) {
    return;
  }

  if (!Array.isArray(list) || !list.length) {
    tbody.innerHTML = emptyRow(8, "🏠", "No hay propiedades");

    return;
  }

  tbody.innerHTML = list
    .map((p) => {
      const image = getMainImage(p);

      /* --------------------------------------------------------
         ESTADO REAL DE LA PROPIEDAD
         -------------------------------------------------------- */

      const rawStatus = String(p.estado ?? p.status ?? "")
        .trim()
        .toLowerCase();

      const propertyStatus =
        p.activa === false ||
        [
          "inactiva",
          "inactivo",
          "desactivada",
          "desactivado",
          "inactive",
        ].includes(rawStatus)
          ? "inactiva"
          : "activa";

      /* --------------------------------------------------------
         BOTÓN ACTIVAR / DESACTIVAR
         -------------------------------------------------------- */

      const stateButton =
        propertyStatus === "activa"
          ? `
              <button
                type="button"
                class="bs"
                onclick="desactivarPropiedad('${esc(p.id)}')"
              >
                ⏸️ Desactivar
              </button>
            `
          : `
              <button
                type="button"
                class="bs bap2"
                onclick="activarPropiedad('${esc(p.id)}')"
              >
                ✅ Activar
              </button>
            `;

      /* --------------------------------------------------------
         FILA
         -------------------------------------------------------- */

      return `
        <tr>

          <td>
            ${
              image
                ? `
                    <img
                      class="thumb"
                      src="${esc(image)}"
                      alt=""
                    >
                  `
                : `
                    <div class="thumb"></div>
                  `
            }
          </td>

          <td class="p">
            ${esc(getPropTitle(p))}
          </td>

          <td>
            ${typeBadge(getPropType(p))}
          </td>

          <td>
            ${esc(getMunicipio(p))}
          </td>

          <td class="p">
            ${money(getPrecio(p))}
          </td>

          <td>
            ${percent(getRendimiento(p))}
          </td>

          <td>
            ${statusBadge(
              p.estado ||
                p.status ||
                (p.activa === false ? "inactiva" : "activa"),
            )}
          </td>

          <td>
            <div class="ab">

              <button
                type="button"
                class="bs be2"
                onclick="editarPropiedad('${esc(p.id)}')"
              >
                ✏️ Editar
              </button>

              <button
                type="button"
                class="bs bt2"
                onclick="verPropiedad('${esc(p.id)}')"
              >
                👁 Ver
              </button>

              ${stateButton}

              <button
                type="button"
                class="bs bd2"
                onclick="eliminarPropiedad('${esc(p.id)}')"
              >
                🗑 Eliminar
              </button>

            </div>
          </td>

        </tr>
      `;
    })
    .join("");
}

/* ============================================================
   FILTRO DE PROPIEDADES
   ============================================================ */

function filterT(value) {
  const q = String(value || "")
    .toLowerCase()
    .trim();

  if (!q) {
    renderPropiedades(propiedades);

    return;
  }

  const result = propiedades.filter((p) => {
    const text = [
      getPropTitle(p),
      getPropType(p),
      getMunicipio(p),
      p.estado,
      p.status,
      p.descripcion,
      p.direccion,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return text.includes(q);
  });

  renderPropiedades(result);
}

/* ============================================================
   PENDIENTES
   ============================================================ */

async function cargarPendientes() {
  try {
    const { data, error } = await s
      .from(TABLE_SUBMISSIONS)
      .select("*")
      .eq("estado", "pendiente")
      .order("created_at", {
        ascending: false,
      });

    if (!error) {
      pendientes = Array.isArray(data) ? data : [];

      actualizarBadgePendientes(pendientes.length);

      return pendientes;
    }
  } catch (error) {
    console.error("[pendientes]", error);

    pendientes = [];

    actualizarBadgePendientes(0);

    toast(error?.message || "No se pudieron cargar las solicitudes.");

    return [];
  }
}

function actualizarBadgePendientes(total) {
  const badge = document.getElementById("nb");

  if (!badge) {
    return;
  }

  badge.textContent = String(total || 0);

  badge.style.display = total > 0 ? "inline-block" : "none";
}

async function renderPendientes() {
  await cargarPendientes();

  const tbody = document.getElementById("pendtb");

  if (!tbody) {
    return;
  }

  if (!pendientes.length) {
    tbody.innerHTML = emptyRow(8, "✅", "No hay solicitudes pendientes");

    return;
  }

  tbody.innerHTML = pendientes
    .map((p) => {
      const image = getMainImage(p);

      return `
        <tr>

          <td>
            ${
              image
                ? `
                  <img
                    class="thumb"
                    src="${esc(image)}"
                    alt=""
                  >
                `
                : `
                  <div class="thumb"></div>
                `
            }
          </td>

          <td class="p">
            ${esc(getPropTitle(p))}
          </td>

          <td>
            ${esc(getUserEmail(p))}
          </td>

          <td>
            ${typeBadge(getPropType(p))}
          </td>

          <td>
            ${esc(getMunicipio(p))}
          </td>

          <td class="p">
            ${money(getPrecio(p))}
          </td>

          <td>
            ${dateMX(p.created_at || p.fecha || p.createdAt)}
          </td>

          <td>
            <div class="ab">

              <button
                class="bs bt2"
                onclick="verPendiente('${esc(p.id)}')"
              >
                👁 Revisar
              </button>

              <button
                class="bs bap2"
                onclick="aprobarDirecto('${esc(p.id)}')"
              >
                ✅ Aprobar
              </button>

              <button
                class="bs brj2"
                onclick="rechazarDirecto('${esc(p.id)}')"
              >
                ✕ Rechazar
              </button>

            </div>
          </td>

        </tr>
      `;
    })
    .join("");
}

/* ============================================================
   VER PROPIEDAD
   ============================================================ */

async function verPropiedad(id) {
  const p = propiedades.find((item) => String(item.id) === String(id));

  if (!p) {
    toast("No se encontró la propiedad.");

    return;
  }

  propiedadEditando = p;

  renderViewProperty(p, document.getElementById("vf"));

  const subtitle = document.getElementById("vmsub");

  if (subtitle) {
    subtitle.textContent = getPropTitle(p);
  }

  const deleteButton = document.getElementById("vdel");

  const approveButton = document.getElementById("vap");

  if (deleteButton) {
    deleteButton.style.display = "inline-block";
  }

  if (approveButton) {
    approveButton.style.display = "none";
  }

  openMod("vmod");
}

function renderViewProperty(p, target) {
  if (!target) {
    return;
  }

  const images = getImages(p);

  const imageHTML = images.length
    ? `
        <div class="pgrid">

          ${images
            .map((img, index) => {
              const url =
                typeof img === "string"
                  ? img
                  : img?.url || img?.publicUrl || "";

              if (!url) {
                return "";
              }

              return `
                  <div class="pi">

                    <img
                      src="${esc(url)}"
                      alt=""
                    >

                    <div class="piord">
                      ${index + 1}
                    </div>

                  </div>
                `;
            })
            .join("")}

        </div>
      `
    : `
        <div style="color:var(--mu)">
          Sin imágenes
        </div>
      `;

  target.innerHTML = `

    <div class="vpsec">

      <h4>
        Información principal
      </h4>

      <div class="vpinfo">

        <div class="vpchip">
          <b>Título:</b>
          ${esc(getPropTitle(p))}
        </div>

        <div class="vpchip">
          <b>Tipo:</b>
          ${esc(getPropType(p))}
        </div>

        <div class="vpchip">
          <b>Municipio:</b>
          ${esc(getMunicipio(p))}
        </div>

        <div class="vpchip">
          <b>Precio:</b>
          ${money(getPrecio(p))}
        </div>

        <div class="vpchip">
          <b>Rendimiento:</b>
          ${percent(getRendimiento(p))}
        </div>

        <div class="vpchip">
          <b>Estado:</b>
          ${esc(normalizeStatus(p.estado || p.status))}
        </div>

      </div>

    </div>


    <div class="vpsec">

      <h4>
        Detalles
      </h4>

      <div class="vpinfo">

        ${
          p.recamaras != null
            ? `
              <div class="vpchip">
                <b>Recámaras:</b>
                ${esc(p.recamaras)}
              </div>
            `
            : ""
        }

        ${
          p.banos != null
            ? `
              <div class="vpchip">
                <b>Baños:</b>
                ${esc(p.banos)}
              </div>
            `
            : ""
        }

        ${
          p.metros != null
            ? `
              <div class="vpchip">
                <b>Metros:</b>
                ${esc(p.metros)}
              </div>
            `
            : ""
        }

        ${
          p.superficie != null
            ? `
              <div class="vpchip">
                <b>Superficie:</b>
                ${esc(p.superficie)}
              </div>
            `
            : ""
        }

        ${
          p.direccion
            ? `
              <div class="vpchip">
                <b>Dirección:</b>
                ${esc(p.direccion)}
              </div>
            `
            : ""
        }

      </div>

    </div>


    ${
      p.descripcion
        ? `
          <div class="vpsec">

            <h4>
              Descripción
            </h4>

            <div
              style="
                color:var(--tx);
                line-height:1.6;
              "
            >
              ${esc(p.descripcion)}
            </div>

          </div>
        `
        : ""
    }


    ${
      p.caracteristicas
        ? `
          <div class="vpsec">

            <h4>
              Características
            </h4>

            <div
              style="
                color:var(--tx);
                line-height:1.6;
              "
            >
              ${esc(p.caracteristicas)}
            </div>

          </div>
        `
        : ""
    }


    <div class="vpsec">

      <h4>
        Imágenes
      </h4>

      ${imageHTML}

    </div>


    ${
      p.created_at
        ? `
          <div class="vpsec">

            <h4>
              Registro
            </h4>

            <div class="vpchip">
              ${dateTimeMX(p.created_at)}
            </div>

          </div>
        `
        : ""
    }

  `;
}

/* ============================================================
   EDITAR PROPIEDAD
   ============================================================ */

async function editarPropiedad(id) {
  const p = propiedades.find((item) => String(item.id) === String(id));

  if (!p) {
    toast("No se encontró la propiedad.");

    return;
  }

  propiedadEditando = p;

  editImagenes = getImages(p).map((item) => {
    if (typeof item === "string") {
      return {
        url: item,
        existing: true,
      };
    }

    return {
      ...item,
      existing: true,
    };
  });

  editArchivos = normalizeArray(p.archivos || p.files || p.documentos).map(
    (item) => {
      if (typeof item === "string") {
        return {
          url: item,
          name: item,
          existing: true,
        };
      }

      return {
        ...item,
        existing: true,
      };
    },
  );

  editEnlaces = normalizeArray(p.enlaces || p.links);

  editFotosPro = normalizeArray(p.fotos_pro || p.imagenes_pro).map((item) => {
    if (typeof item === "string") {
      return { url: item, existing: true };
    }
    return { ...item, existing: true };
  });

  editVideos = normalizeArray(p.videos || []).map((item) => {
    if (typeof item === "string") {
      return { url: item, existing: true };
    }
    return { ...item, existing: true };
  });

  const existingVideo =
    p.video_url ||
    editVideos.find((item) => item?.url)?.url ||
    null;

  if (existingVideo && !editVideos.some((item) => item?.url === existingVideo)) {
    editVideos.unshift({ url: existingVideo, existing: true });
  }

  editPortadaVideo =
    (String(p.tipo_portada || p.portada_tipo || "").toLowerCase() === "video")
      ? (p.portada_url || null)
      : null;

  const subtitle = document.getElementById("emsub");

  if (subtitle) {
    subtitle.textContent = getPropTitle(p);
  }

  buildEditForm(p);

  openMod("emod");
}
function buildEditForm(p) {
  const target =
    document.getElementById("ef");

  if (!target) {
    return;
  }

  target.innerHTML =
  propertyFormHTML(
    p,
    "edit"
  );

bindPropertyForm(
  "edit",
  p
);

setTimeout(() => {
  initAdminPropertyMap(
    p.latitud,
    p.longitud,
    "edit"
  );
}, 100);

  /*
   * El formulario ya fue creado.
   * Ahora inicializamos el mapa con
   * las coordenadas de la propiedad.
   */

  const lat =
    p &&
    Number.isFinite(
      Number(p.latitud)
    )
      ? Number(p.latitud)
      : null;

  const lng =
    p &&
    Number.isFinite(
      Number(p.longitud)
    )
      ? Number(p.longitud)
      : null;

  initAdminPropertyMap(
    lat,
    lng
  );
}



/* ============================================================
   NUEVA PROPIEDAD
   ============================================================ */

function buildNewForm() {
  const nf =
    document.getElementById("nf");

  if (!nf) {
    return;
  }

  nf.innerHTML =
    propertyFormHTML(
      {},
      "new"
    );

  const marker =
    document.createElement("span");

  marker.id =
    "newFormReady";

  marker.style.display =
    "none";

  nf.appendChild(
    marker
  );

  bindPropertyForm(
    "new",
    {}
  );

  
}

/* ============================================================
   HTML FORMULARIO
   ============================================================ */

function propertyFormHTML(p = {}, mode = "new") {
  const tipo = String(
    p.tipo ||
    p.type ||
    "terreno"
  ).toLowerCase();

  const d =
    p.detalles &&
    typeof p.detalles === "object"
      ? p.detalles
      : {};

  const house =
    [
      "casa",
      "hacienda",
      "rancho",
      "departamento",
      "villa",
    ].some((x) => tipo.includes(x)) ||
    Number(p.construccion_m2 || 0) > 0 ||
    d.recamaras != null ||
    d.banos != null;

  const v = (key) =>
    p[key] ?? "";

  const latitud =
    Number.isFinite(Number(p.latitud))
      ? Number(p.latitud)
      : null;

  const longitud =
    Number.isFinite(Number(p.longitud))
      ? Number(p.longitud)
      : null;

  return `
    <div class="template-banner">
      <strong>PLANTILLA:</strong>

      <span>
        ${
          house
            ? "🏠 TERRENO CON CASA"
            : "🌿 SOLO TERRENO"
        }
      </span>

      <small>
        Los datos existentes se cargan automáticamente.
      </small>
    </div>

    <div class="g2">

      <div class="fg gfull">
        <label>
          TÍTULO <span>*</span>
        </label>

        <input
          id="${mode}_titulo"
          class="fi2"
          value="${esc(
            v("titulo") ||
            p.title ||
            ""
          )}"
        >
      </div>

      <div class="fg">
        <label>
          TIPO <span>*</span>
        </label>

        <select
          id="${mode}_tipo"
          class="fsel"
        >
          ${[
            "terreno",
            "casa",
            "hacienda",
            "rancho",
            "departamento",
            "local comercial",
            "oficina",
            "bodega",
            "industrial",
            "otro",
          ]
            .map((x) =>
              option(x, tipo)
            )
            .join("")}
        </select>
      </div>

      <div class="fg">
        <label>
          MUNICIPIO / CIUDAD <span>*</span>
        </label>

        <input
          id="${mode}_municipio"
          class="fi2"
          value="${esc(
            v("municipio")
          )}"
        >
      </div>

      <!-- =====================================================
           UBICACIÓN EN MAPA
           ===================================================== -->

      <div class="fg gfull">

        <label>
          UBICACIÓN DE LA PROPIEDAD
        </label>

        <div class="property-location-help">
          Toca el mapa para colocar el punto exacto.
          También puedes arrastrar el marcador.
        </div>

        <div class="property-location-map">
          <div
            id="${mode}_adminPropertyMap"
          ></div>
        </div>

        <input
          type="hidden"
          id="${mode}_latitud"
          value="${
            latitud !== null
              ? latitud
              : ""
          }"
        >

        <input
          type="hidden"
          id="${mode}_longitud"
          value="${
            longitud !== null
              ? longitud
              : ""
          }"
        >

        <div
          id="${mode}_adminPropertyCoordinates"
          class="property-location-coordinates"
        >
          ${
            latitud !== null &&
            longitud !== null
              ? `Coordenadas: ${latitud.toFixed(
                  6
                )}, ${longitud.toFixed(
                  6
                )}`
              : "Sin ubicación seleccionada"
          }
        </div>

      </div>

      <div class="fg">
        <label>DIRECCIÓN</label>

        <input
          id="${mode}_direccion"
          class="fi2"
          value="${esc(
            v("direccion")
          )}"
        >
      </div>

      <div class="fg">
        <label>SUPERFICIE</label>

        <input
          id="${mode}_superficie"
          class="fi2"
          type="number"
          value="${esc(
            v("superficie")
          )}"
        >
      </div>

      <div class="fg">
        <label>UNIDAD SUPERFICIE</label>

        <select
          id="${mode}_unidad_superficie"
          class="fsel"
        >
          ${option(
            "m2",
            p.unidad_superficie || "m2"
          )}

          ${option(
            "ha",
            p.unidad_superficie || "m2"
          )}
        </select>
      </div>

      <div class="fg">
        <label>FRENTE</label>

        <input
          id="${mode}_frente"
          class="fi2"
          type="number"
          value="${esc(
            v("frente")
          )}"
        >
      </div>

      <div class="fg">
        <label>FONDO</label>

        <input
          id="${mode}_fondo"
          class="fi2"
          type="number"
          value="${esc(
            v("fondo")
          )}"
        >
      </div>

      <div class="fg">
        <label>
          PRECIO ACTUAL <span>*</span>
        </label>

        <input
          id="${mode}_precio"
          class="fi2"
          type="number"
          value="${esc(
            p.precio_actual ??
            p.precio ??
            ""
          )}"
        >
      </div>

      <div class="fg">
        <label>
          PRECIO DE MERCADO
        </label>

        <input
          id="${mode}_precio_mercado"
          class="fi2"
          type="number"
          value="${esc(
            v("precio_mercado")
          )}"
        >
      </div>

      <div class="fg">
        <label>
          PRECIO ESPERADO
        </label>

        <input
          id="${mode}_precio_esperado"
          class="fi2"
          type="number"
          value="${esc(
            v("precio_esperado")
          )}"
        >
      </div>

      <div class="fg">
        <label>
          UNIDAD PRECIO
        </label>

        <select
          id="${mode}_unidad_precio"
          class="fsel"
        >
          ${option(
            "m2",
            p.unidad_precio || "m2"
          )}

          ${option(
            "total",
            p.unidad_precio || "m2"
          )}

          ${option(
            "ha",
            p.unidad_precio || "m2"
          )}
        </select>
      </div>

      <div class="fg">
        <label>MONEDA</label>

        <select
          id="${mode}_moneda"
          class="fsel"
        >
          ${option(
            "MXN",
            p.moneda || "MXN"
          )}

          ${option(
            "USD",
            p.moneda || "MXN"
          )}
        </select>
      </div>

      <div class="fg">
        <label>
          RENDIMIENTO (%)
        </label>

        <input
          id="${mode}_rendimiento"
          class="fi2"
          type="number"
          step="0.01"
          value="${esc(
            v("rendimiento")
          )}"
        >
      </div>

      <div class="fg">
        <label>
          ESTATUS LEGAL
        </label>

        <input
          id="${mode}_estatus_legal"
          class="fi2"
          value="${esc(
            p.estatus_legal ||
            "Sin revisar"
          )}"
        >
      </div>

      <div class="fg">
        <label>ESTADO</label>

        <select
          id="${mode}_estado"
          class="fsel"
        >
          ${option(
            "activa",
            p.estado || "activa"
          )}

          ${option(
            "inactiva",
            p.estado || "activa"
          )}
        </select>
      </div>

      <div class="fg">
        <label class="checkline">
          <input
            id="${mode}_destacada"
            type="checkbox"
            ${
              p.destacada
                ? "checked"
                : ""
            }
          >

          DESTACADA
        </label>
      </div>

      <div class="fg">
        <label class="checkline">
          <input
            id="${mode}_certeza_legal"
            type="checkbox"
            ${
              p.certeza_legal
                ? "checked"
                : ""
            }
          >

          CERTEZA LEGAL
        </label>
      </div>

      ${
        house
          ? `
            <div class="fg gfull">
              <div class="template-title">
                🏠 DATOS DE LA CASA
              </div>
            </div>

            <div class="fg">
              <label>
                CONSTRUCCIÓN (m²)
              </label>

              <input
                id="${mode}_construccion_m2"
                class="fi2"
                type="number"
                value="${esc(
                  p.construccion_m2 ??
                  ""
                )}"
              >
            </div>

            <div class="fg">
              <label>RECÁMARAS</label>

              <input
                id="${mode}_recamaras"
                class="fi2"
                type="number"
                value="${esc(
                  d.recamaras ??
                  ""
                )}"
              >
            </div>

            <div class="fg">
              <label>BAÑOS</label>

              <input
                id="${mode}_banos"
                class="fi2"
                type="number"
                step="0.5"
                value="${esc(
                  d.banos ??
                  ""
                )}"
              >
            </div>

            <div class="fg">
              <label>
                ESTACIONAMIENTOS
              </label>

              <input
                id="${mode}_estacionamientos"
                class="fi2"
                type="number"
                value="${esc(
                  d.estacionamientos ??
                  ""
                )}"
              >
            </div>

            <div class="fg">
              <label>PLANTAS</label>

              <input
                id="${mode}_plantas"
                class="fi2"
                type="number"
                value="${esc(
                  d.plantas ??
                  ""
                )}"
              >
            </div>
          `
          : `
            <div class="fg gfull">
              <div class="template-title">
                🌿 DATOS DEL TERRENO
              </div>
            </div>
          `
      }

      <div class="fg gfull">
        <label>DESCRIPCIÓN</label>

        <textarea
          id="${mode}_descripcion"
          class="fta"
        >${esc(
          p.descripcion || ""
        )}</textarea>
      </div>

      <div class="fg gfull">
        <label>
          DESCRIPCIÓN PROFESIONAL
        </label>

        <textarea
          id="${mode}_descripcion_pro"
          class="fta"
        >${esc(
          p.descripcion_pro || ""
        )}</textarea>
      </div>

      <div class="fg gfull">
        <label>
          CARACTERÍSTICAS (JSON o texto)
        </label>

        <textarea
          id="${mode}_caracteristicas"
          class="fta"
        >${esc(
          typeof p.caracteristicas === "string"
            ? p.caracteristicas
            : JSON.stringify(
                p.caracteristicas || {}
              )
        )}</textarea>
      </div>

      <div class="fg gfull">
        <label>
          SERVICIOS CERCANOS (JSON o texto)
        </label>

        <textarea
          id="${mode}_servicios_cercanos"
          class="fta"
        >${esc(
          typeof p.servicios_cercanos === "string"
            ? p.servicios_cercanos
            : JSON.stringify(
                p.servicios_cercanos || {}
              )
        )}</textarea>
      </div>

      <div class="fg">
        <label>CONTACTO NOMBRE</label>

        <input
          id="${mode}_contacto_nombre"
          class="fi2"
          value="${esc(
            p.contacto_nombre || ""
          )}"
        >
      </div>

      <div class="fg">
        <label>
          CONTACTO TELÉFONO
        </label>

        <input
          id="${mode}_contacto_telefono"
          class="fi2"
          value="${esc(
            p.contacto_telefono || ""
          )}"
        >
      </div>

      <div class="fg">
        <label>WHATSAPP</label>

        <input
          id="${mode}_contacto_whatsapp"
          class="fi2"
          value="${esc(
            p.contacto_whatsapp || ""
          )}"
        >
      </div>

      <div class="fg">
        <label>CONTACTO EMAIL</label>

        <input
          id="${mode}_contacto_email"
          class="fi2"
          value="${esc(
            p.contacto_email || ""
          )}"
        >
      </div>

      <div class="fg">
        <label>DUEÑO</label>

        <input
          id="${mode}_dueno_nombre"
          class="fi2"
          value="${esc(
            p.dueno_nombre || ""
          )}"
        >
      </div>

      <div class="fg">
        <label>
          TELÉFONO DUEÑO
        </label>

        <input
          id="${mode}_dueno_telefono"
          class="fi2"
          value="${esc(
            p.dueno_telefono || ""
          )}"
        >
      </div>

      <div class="fg">
        <label>EMAIL DUEÑO</label>

        <input
          id="${mode}_dueno_email"
          class="fi2"
          value="${esc(
            p.dueno_email || ""
          )}"
        >
      </div>

      <div class="fg">
        <label>TOUR 360</label>

        <input
          id="${mode}_tour_360"
          class="fi2"
          value="${esc(
            p.tour_360 || ""
          )}"
        >
      </div>

      <div class="fg">
        <label>PAQUETE</label>

        <input
          id="${mode}_paquete"
          class="fi2"
          value="${esc(
            p.paquete ||
            "basico"
          )}"
        >
      </div>

      <div class="fg">
        <label>
          PRECIO SESIÓN
        </label>

        <input
          id="${mode}_precio_sesion"
          class="fi2"
          type="number"
          value="${esc(
            p.precio_sesion ??
            0
          )}"
        >
      </div>

      <div class="fg">
        <label>
          FECHA SESIÓN
        </label>

        <input
          id="${mode}_sesion_fecha"
          class="fi2"
          type="date"
          value="${esc(
            p.sesion_fecha ||
            ""
          )}"
        >
      </div>

      <div class="fg">
        <label>
          COMISIÓN (%)
        </label>

        <input
          id="${mode}_comision_porcentaje"
          class="fi2"
          type="number"
          value="${esc(
            p.comision_porcentaje ??
            5
          )}"
        >
      </div>

      <div class="fg">
        <label class="checkline">
          <input
            id="${mode}_sesion_pagada"
            type="checkbox"
            ${
              p.sesion_pagada
                ? "checked"
                : ""
            }
          >

          SESIÓN PAGADA
        </label>
      </div>

      <div class="fg gfull">
        <div class="ups">
          <div class="upt">
            FOTOGRAFÍAS
          </div>

          <div
            class="dz"
            id="${mode}_dropImages"
          >
            <input
              type="file"
              multiple
              accept="image/*"
              id="${mode}_images"
            >

            <div class="dzi">📷</div>

            <div class="dzl">
              Arrastra imágenes o
              <strong>
                selecciona archivos
              </strong>
            </div>
          </div>

          <div
            class="pgrid"
            id="${mode}_imageGrid"
          ></div>
        </div>
      </div>

      <div class="fg gfull">
        <div class="ups">
          <div class="upt">
            FOTOGRAFÍAS PROFESIONALES
          </div>
          <div class="dz">
            <input type="file" multiple accept="image/*" id="${mode}_fotosPro">
            <div class="dzi">🖼️</div>
            <div class="dzl">Agrega fotografías profesionales.</div>
          </div>
          <div class="pgrid" id="${mode}_fotosProGrid"></div>
        </div>
      </div>

      <div class="fg gfull">
        <div class="ups">
          <div class="upt">VIDEO DE LA PROPIEDAD</div>
          <div class="dz">
            <input type="file" accept="video/mp4,video/quicktime,video/x-m4v,video/m4v" id="${mode}_video">
            <div class="dzi">🎬</div>
            <div class="dzl">MP4 / MOV / M4V — máximo 200 MB.</div>
          </div>
          <div class="fl2" id="${mode}_videoList"></div>
        </div>
      </div>

      <div class="fg gfull">
        <div class="ups">
          <div class="upt">PORTADA DEL VIDEO</div>
          <div class="dz">
            <input type="file" accept="image/*" id="${mode}_videoCover">
            <div class="dzi">🎞️</div>
            <div class="dzl">Imagen que aparecerá como portada del video.</div>
          </div>
          <div class="fl2" id="${mode}_videoCoverList"></div>
        </div>
      </div>

      <div class="fg gfull">
        <div class="ups">
          <div class="upt">
            DOCUMENTOS / ARCHIVOS
          </div>

          <div
            class="dz"
            id="${mode}_dropFiles"
          >
            <input
              type="file"
              multiple
              id="${mode}_files"
            >

            <div class="dzi">📎</div>

            <div class="dzl">
              Arrastra archivos o
              <strong>
                selecciona archivos
              </strong>
            </div>
          </div>

          <div
            class="fl2"
            id="${mode}_fileList"
          ></div>
        </div>
      </div>

      <div class="fg gfull">
        <div class="ups">

          <div class="upt">
            ENLACES
          </div>

          <div class="lar">
            <input
              id="${mode}_linkInput"
              class="fi2"
              placeholder="https://..."
            >

            <button
              type="button"
              class="labtn"
              onclick="addLink('${mode}')"
            >
              + Agregar
            </button>
          </div>

          <div
            id="${mode}_linkList"
          ></div>

        </div>
      </div>

    </div>
  `;
}
function option(label, current) {
  const selected =
    String(current || "").toLowerCase() === String(label).toLowerCase()
      ? "selected"
      : "";

  return `
    <option
      value="${esc(label)}"
      ${selected}
    >
      ${esc(label)}
    </option>
  `;
}

/* ============================================================
   BIND FORMULARIOS
   ============================================================ */

function bindPropertyForm(mode, p) {
  void p;

  const imageInput = document.getElementById(`${mode}_images`);

  const fileInput = document.getElementById(`${mode}_files`);
  const fotosProInput = document.getElementById(`${mode}_fotosPro`);
  const videoInput = document.getElementById(`${mode}_video`);
  const videoCoverInput = document.getElementById(`${mode}_videoCover`);

  if (imageInput) {
    imageInput.addEventListener("change", (event) => {
      handleImages(mode, [...event.target.files]);

      /*
       * Permite volver a seleccionar
       * el mismo archivo.
       */
      event.target.value = "";
    });
  }

  if (fileInput) {
    fileInput.addEventListener("change", (event) => {
      handleFiles(mode, [...event.target.files]);

      event.target.value = "";
    });
  }

  if (fotosProInput) {
    fotosProInput.addEventListener("change", (event) => {
      handleFotosPro(mode, [...event.target.files]);
      event.target.value = "";
    });
  }

  if (videoInput) {
    videoInput.addEventListener("change", (event) => {
      handleVideo(mode, event.target.files?.[0] || null);
      event.target.value = "";
    });
  }

  if (videoCoverInput) {
    videoCoverInput.addEventListener("change", (event) => {
      handleVideoCover(mode, event.target.files?.[0] || null);
      event.target.value = "";
    });
  }

  setupDropZone(mode, "images");

  setupDropZone(mode, "files");

  renderImages(mode);
  renderFiles(mode);
  renderLinks(mode);
  renderFotosPro(mode);
  renderVideo(mode);
  renderVideoCover(mode);
   
  const latitud =
    Number.isFinite(Number(p?.latitud))
      ? Number(p.latitud)
      : null;

  const longitud =
    Number.isFinite(Number(p?.longitud))
      ? Number(p.longitud)
      : null;

  setTimeout(() => {
    initAdminPropertyMap(
      latitud,
      longitud,
      mode
    );
  }, 100);
}


/* ============================================================
   FOTOS PROFESIONALES / VIDEO / PORTADA DE VIDEO
   ============================================================ */

function handleFotosPro(mode, files) {
  const valid = files.filter(
    (file) => file && file.type && file.type.startsWith("image/"),
  );

  if (!valid.length) return;

  const target = mode === "new" ? nuevasFotosPro : editFotosPro;

  target.push(
    ...valid.map((file) => ({
      file,
      existing: false,
    })),
  );

  renderFotosPro(mode);
}

function renderFotosPro(mode) {
  const target = document.getElementById(`${mode}_fotosProGrid`);
  if (!target) return;

  const list = mode === "new" ? nuevasFotosPro : editFotosPro;

  target.innerHTML = list.map((item, index) => {
    const file = item instanceof File ? item : item?.file;
    const url = file
      ? URL.createObjectURL(file)
      : (typeof item === "string" ? item : item?.url || item?.publicUrl || "");

    if (!url) return "";

    return `
      <div class="pi">
        <img src="${esc(url)}" alt="">
        <button type="button" class="pidel" onclick="removeFotosPro('${mode}', ${index})">✕</button>
      </div>
    `;
  }).join("");
}

function removeFotosPro(mode, index) {
  const list = mode === "new" ? nuevasFotosPro : editFotosPro;
  if (index < 0 || index >= list.length) return;
  list.splice(index, 1);
  renderFotosPro(mode);
}

function handleVideo(mode, file) {
  if (!file) return;

  const allowed = [
    "video/mp4",
    "video/quicktime",
    "video/x-m4v",
    "video/m4v",
  ];

  if (!allowed.includes(String(file.type || "").toLowerCase())) {
    toast("El video debe ser MP4, MOV o M4V.");
    return;
  }

  const target = mode === "new" ? nuevosVideos : editVideos;
  target.splice(0, target.length, {
    file,
    existing: false,
  });

  renderVideo(mode);
}

function renderVideo(mode) {
  const target = document.getElementById(`${mode}_videoList`);
  if (!target) return;

  const list = mode === "new" ? nuevosVideos : editVideos;
  const item = list[0];

  if (!item) {
    target.innerHTML = "";
    return;
  }

  const file = item instanceof File ? item : item?.file;
  const name = file?.name || item?.name || item?.url || "Video";

  target.innerHTML = `
    <div class="fir">
      <span class="fii">🎬</span>
      <span class="fin">${esc(name)}</span>
      <button type="button" class="fdel" onclick="removeVideo('${mode}')">✕</button>
    </div>
  `;
}

function removeVideo(mode) {
  const list = mode === "new" ? nuevosVideos : editVideos;
  list.splice(0, list.length);
  renderVideo(mode);
}

function handleVideoCover(mode, file) {
  if (!file) return;

  if (!file.type || !file.type.startsWith("image/")) {
    toast("La portada del video debe ser una imagen.");
    return;
  }

  if (mode === "new") {
    nuevaPortadaVideo = file;
  } else {
    editPortadaVideo = file;
  }

  renderVideoCover(mode);
}

function renderVideoCover(mode) {
  const target = document.getElementById(`${mode}_videoCoverList`);
  if (!target) return;

  const item = mode === "new" ? nuevaPortadaVideo : editPortadaVideo;

  if (!item) {
    target.innerHTML = "";
    return;
  }

  const file = item instanceof File ? item : null;
  const url = file
    ? URL.createObjectURL(file)
    : (typeof item === "string" ? item : item?.url || item?.publicUrl || "");

  target.innerHTML = `
    <div class="pi">
      <img src="${esc(url)}" alt="">
      <button type="button" class="pidel" onclick="removeVideoCover('${mode}')">✕</button>
    </div>
  `;
}

function removeVideoCover(mode) {
  if (mode === "new") {
    nuevaPortadaVideo = null;
  } else {
    editPortadaVideo = null;
  }
  renderVideoCover(mode);
}

/* ============================================================
   IMÁGENES
   ============================================================ */

function handleImages(mode, files) {
  const valid = files.filter((file) => {
    return file && file.type && file.type.startsWith("image/");
  });

  if (!valid.length) {
    return;
  }

  if (mode === "new") {
    nuevasImagenes.push(...valid);
  } else {
    editImagenes.push(
      ...valid.map((file) => ({
        file,
        existing: false,
      })),
    );
  }

  renderImages(mode);
}

function renderImages(mode) {
  const target = document.getElementById(`${mode}_imageGrid`);

  if (!target) {
    return;
  }

  const list = mode === "new" ? nuevasImagenes : editImagenes;

  if (!list.length) {
    target.innerHTML = "";
    return;
  }

  target.innerHTML = list
    .map((item, index) => {
      const file = item instanceof File ? item : item?.file;

      const url = file
        ? URL.createObjectURL(file)
        : typeof item === "string"
          ? item
          : item?.url || item?.publicUrl || "";

      if (!url) {
        return "";
      }

      return `
          <div class="pi">

            <img
              src="${esc(url)}"
              alt=""
            >

            <button
              type="button"
              class="pidel"
              onclick="removeImage('${mode}', ${index})"
            >
              ✕
            </button>

            ${
              index === 0
                ? `
                  <div class="pimain">
                    PRINCIPAL
                  </div>
                `
                : ""
            }

            <div class="piord">
              ${index + 1}
            </div>

          </div>
        `;
    })
    .join("");
}

function removeImage(mode, index) {
  const list = mode === "new" ? nuevasImagenes : editImagenes;

  if (index < 0 || index >= list.length) {
    return;
  }

  list.splice(index, 1);

  renderImages(mode);
}

/* ============================================================
   ARCHIVOS
   ============================================================ */

function handleFiles(mode, files) {
  const valid = files.filter(Boolean);

  if (!valid.length) {
    return;
  }

  if (mode === "new") {
    nuevosArchivos.push(...valid);
  } else {
    editArchivos.push(
      ...valid.map((file) => ({
        file,
        existing: false,
      })),
    );
  }

  renderFiles(mode);
}

function renderFiles(mode) {
  const target = document.getElementById(`${mode}_fileList`);

  if (!target) {
    return;
  }

  const list = mode === "new" ? nuevosArchivos : editArchivos;

  if (!list.length) {
    target.innerHTML = "";
    return;
  }

  target.innerHTML = list
    .map((item, index) => {
      const file = item instanceof File ? item : item?.file;

      const name = file?.name || item?.name || item?.path || "Archivo";

      const size = file?.size ? formatBytes(file.size) : "";

      return `
          <div class="fir">

            <span class="fii">
              📎
            </span>

            <span class="fin">
              ${esc(name)}
            </span>

            <span class="fis2">
              ${esc(size)}
            </span>

            <button
              type="button"
              class="fdel"
              onclick="removeFile('${mode}', ${index})"
            >
              ✕
            </button>

          </div>
        `;
    })
    .join("");
}

function removeFile(mode, index) {
  const list = mode === "new" ? nuevosArchivos : editArchivos;

  if (index < 0 || index >= list.length) {
    return;
  }

  list.splice(index, 1);

  renderFiles(mode);
}

/* ============================================================
   ENLACES
   ============================================================ */

function addLink(mode) {
  const input = document.getElementById(`${mode}_linkInput`);

  if (!input) {
    return;
  }

  const url = input.value.trim();

  if (!url) {
    toast("Escribe un enlace.");

    return;
  }

  let validURL;

  try {
    validURL = new URL(url);

    if (validURL.protocol !== "http:" && validURL.protocol !== "https:") {
      throw new Error("Protocolo no permitido");
    }
  } catch {
    toast("El enlace no es válido.");

    return;
  }

  const link = {
    url: validURL.href,
    titulo: validURL.href,
  };

  if (mode === "new") {
    nuevosEnlaces.push(link);
  } else {
    editEnlaces.push(link);
  }

  input.value = "";

  renderLinks(mode);
}

function renderLinks(mode) {
  const target = document.getElementById(`${mode}_linkList`);

  if (!target) {
    return;
  }

  const list = mode === "new" ? nuevosEnlaces : editEnlaces;

  if (!list.length) {
    target.innerHTML = "";
    return;
  }

  target.innerHTML = list
    .map((link, index) => {
      const url = typeof link === "string" ? link : link?.url || "";

      return `
          <div class="lirow">

            <span class="liic">
              🔗
            </span>

            <span class="liurl">
              ${esc(url)}
            </span>

            <button
              type="button"
              class="lide"
              onclick="removeLink('${mode}', ${index})"
            >
              ✕
            </button>

          </div>
        `;
    })
    .join("");
}

function removeLink(mode, index) {
  const list = mode === "new" ? nuevosEnlaces : editEnlaces;

  if (index < 0 || index >= list.length) {
    return;
  }

  list.splice(index, 1);

  renderLinks(mode);
}

/* ============================================================
   DRAG & DROP
   ============================================================ */

function setupDropZone(mode, type) {
  const suffix = type === "images" ? "Images" : "Files";

  const zone = document.getElementById(`${mode}_drop${suffix}`);

  if (!zone) {
    return;
  }

  if (zone.dataset.bound === "1") {
    return;
  }

  zone.dataset.bound = "1";

  ["dragenter", "dragover"].forEach((eventName) => {
    zone.addEventListener(eventName, (event) => {
      event.preventDefault();
      event.stopPropagation();

      zone.classList.add("drag");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    zone.addEventListener(eventName, (event) => {
      event.preventDefault();
      event.stopPropagation();

      zone.classList.remove("drag");
    });
  });

  zone.addEventListener("drop", (event) => {
    const files = [...(event.dataTransfer?.files || [])];

    if (!files.length) {
      return;
    }

    if (type === "images") {
      handleImages(mode, files);
    } else {
      handleFiles(mode, files);
    }
  });
}

/* ============================================================
   STORAGE
   ============================================================ */

async function uploadFile(bucket, file, folder) {
  if (!file) {
    throw new Error("Archivo inválido.");
  }

  const MAX_MEDIA_BYTES = 200 * 1024 * 1024;
  const MAX_PRIVATE_BYTES = 25 * 1024 * 1024;

  const mime = String(file.type || "").toLowerCase();
  const isMediaBucket = bucket === BUCKET_IMAGES;
  const isPrivateBucket = bucket === BUCKET_FILES;

  if (isMediaBucket) {
    const allowedMedia =
      mime.startsWith("image/") ||
      [
        "video/mp4",
        "video/quicktime",
        "video/x-m4v",
        "video/m4v",
      ].includes(mime);

    if (!allowedMedia) {
      throw new Error(
        `Tipo de archivo no permitido en ${bucket}: ${mime || "MIME vacío"}.`,
      );
    }

    if (Number(file.size || 0) > MAX_MEDIA_BYTES) {
      throw new Error(
        `El archivo supera el límite de ${formatBytes(MAX_MEDIA_BYTES)}.`,
      );
    }
  }

  if (isPrivateBucket) {
    const allowedPrivate = [
      "application/pdf",
      "application/zip",
      "application/x-zip-compressed",
      "application/vnd.google-earth.kml+xml",
      "application/vnd.google-earth.kmz",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
      "image/jpeg",
      "image/png",
    ];

    if (mime && !allowedPrivate.includes(mime)) {
      throw new Error(
        `Tipo de archivo no permitido en ${bucket}: ${mime}.`,
      );
    }

    if (Number(file.size || 0) > MAX_PRIVATE_BYTES) {
      throw new Error(
        `El archivo privado supera el límite de ${formatBytes(MAX_PRIVATE_BYTES)}.`,
      );
    }
  }

  const originalName = file.name || "archivo";

  const cleanName = originalName.replace(/[^\w.\-]+/g, "_").toLowerCase();

  const path = `${folder}/${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}_${cleanName}`;

  const { error } = await s.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    throw error;
  }

  const privateUpload = bucket === BUCKET_FILES;
return {
  url: privateUpload ? path :
    s.storage.from(bucket).getPublicUrl(path).data?.publicUrl || "",
  path,
  name: originalName,
  size: file.size || 0,
  type: file.type || "",
};
}

async function uploadCollection(list, bucket, folder, progressCallback) {
  const output = [];

  const total = Array.isArray(list) ? list.length : 0;

  if (!total) {
    if (progressCallback) {
      progressCallback(100);
    }

    return output;
  }

  for (let i = 0; i < total; i++) {
    const item = list[i];

    if (item && item.existing && !item.file) {
      output.push(item);

      if (progressCallback) {
        progressCallback(((i + 1) / total) * 100);
      }

      continue;
    }

    const file = item instanceof File ? item : item?.file;

    if (!file) {
      continue;
    }

    const uploaded = await uploadFile(bucket, file, folder);

    output.push(uploaded);

    if (progressCallback) {
      progressCallback(((i + 1) / total) * 100);
    }
  }

  return output;
}

/* ============================================================
   FORMULARIO — DATOS
   ============================================================ */

function readNumberField(id) {
  const v = valueOf(id);

  if (v === "") {
    return null;
  }

  const n = Number(v);

  return Number.isFinite(n) ? n : null;
}

function readJsonField(id) {
  const raw = valueOf(id);

  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    return {
      texto: raw,
    };
  }
}

function collectPropertyForm(mode, statusOverride = null) {
  let estado = statusOverride || valueOf(`${mode}_estado`) || "activa";

  estado = String(estado).toLowerCase().trim();

  if (estado !== "activa" && estado !== "inactiva") {
    estado = "activa";
  }

  const tipo = valueOf(`${mode}_tipo`) || "terreno";

  const detalles =
    mode === "edit" &&
    propiedadEditando?.detalles &&
    typeof propiedadEditando.detalles === "object"
      ? {
          ...propiedadEditando.detalles,
        }
      : {};

  for (const k of [
    "recamaras",
    "banos",
    "estacionamientos",
    "plantas",
    "ano_construccion",
  ]) {
    const v = valueOf(`${mode}_${k}`);

    if (v !== "") {
      detalles[k] = Number(v);
    }
  }

  const data = {
    titulo: valueOf(`${mode}_titulo`),

    fotos_pro: [],

    videos: [],

    video_url: null,

    portada_url: null,

    portada_tipo: null,

    tipo_portada: null,

    tipo,

    municipio: valueOf(`${mode}_municipio`),

        latitud:
      getAdminPropertyCoordinates(
        mode
      ).latitud,

    longitud:
      getAdminPropertyCoordinates(
        mode
      ).longitud,

    direccion: valueOf(`${mode}_direccion`) || null,

    superficie: readNumberField(`${mode}_superficie`) ?? 0,

    unidad_superficie: valueOf(`${mode}_unidad_superficie`) || "m2",

    frente: readNumberField(`${mode}_frente`),

    fondo: readNumberField(`${mode}_fondo`),

    precio_actual: readNumberField(`${mode}_precio`) ?? 0,

    precio_mercado: readNumberField(`${mode}_precio_mercado`),

    precio_esperado: readNumberField(`${mode}_precio_esperado`),

    unidad_precio: valueOf(`${mode}_unidad_precio`) || "m2",

    moneda: valueOf(`${mode}_moneda`) || "MXN",

    rendimiento: readNumberField(`${mode}_rendimiento`) ?? 0,

    estatus_legal: valueOf(`${mode}_estatus_legal`) || "Sin revisar",

    certeza_legal: !!document.getElementById(`${mode}_certeza_legal`)?.checked,

    destacada: !!document.getElementById(`${mode}_destacada`)?.checked,

    descripcion: valueOf(`${mode}_descripcion`) || null,

    descripcion_pro: valueOf(`${mode}_descripcion_pro`) || null,

    caracteristicas: readJsonField(`${mode}_caracteristicas`),

    servicios_cercanos: readJsonField(`${mode}_servicios_cercanos`),

    contacto_nombre: valueOf(`${mode}_contacto_nombre`) || null,

    contacto_telefono: valueOf(`${mode}_contacto_telefono`) || null,

    contacto_whatsapp: valueOf(`${mode}_contacto_whatsapp`) || null,

    contacto_email: valueOf(`${mode}_contacto_email`) || null,

    dueno_nombre: valueOf(`${mode}_dueno_nombre`) || null,

    dueno_telefono: valueOf(`${mode}_dueno_telefono`) || null,

    dueno_email: valueOf(`${mode}_dueno_email`) || null,

    tour_360: valueOf(`${mode}_tour_360`) || null,

    paquete: valueOf(`${mode}_paquete`) || "basico",

    precio_sesion: readNumberField(`${mode}_precio_sesion`) ?? 0,

    sesion_pagada: !!document.getElementById(`${mode}_sesion_pagada`)?.checked,

    sesion_fecha: valueOf(`${mode}_sesion_fecha`) || null,

    comision_porcentaje: readNumberField(`${mode}_comision_porcentaje`) ?? 5,

    detalles,

    estado,

    activa: estado === "activa",

    status: estado,
  };

  data.construccion_m2 = readNumberField(`${mode}_construccion_m2`);

  return data;
}

function validateProperty(data) {
  const estado = String(data.estado || "activa")
    .trim()
    .toLowerCase();

  /*
   * Una propiedad INACTIVA puede guardarse como borrador
   * para que el administrador la termine después.
   *
   * La validación completa solamente bloquea PUBLICAR / ACTIVAR.
   */
  if (estado !== "activa") {
    return true;
  }

  /* ==========================================================
     CAMPOS OBLIGATORIOS PARA PUBLICAR
     ========================================================== */

  if (!data.titulo || !data.titulo.trim()) {
    toast("El título es obligatorio.");
    return false;
  }

  if (!data.tipo || !data.tipo.trim()) {
    toast("Selecciona el tipo de propiedad.");
    return false;
  }

  if (!data.municipio || !data.municipio.trim()) {
    toast("Indica el municipio o ciudad.");
    return false;
  }

  if (
    data.superficie === null ||
    !Number.isFinite(Number(data.superficie)) ||
    Number(data.superficie) <= 0
  ) {
    toast("La superficie debe ser mayor que 0.");
    return false;
  }

  if (
    data.precio_actual === null ||
    !Number.isFinite(Number(data.precio_actual)) ||
    Number(data.precio_actual) <= 0
  ) {
    toast("El precio actual debe ser mayor que 0.");
    return false;
  }

  if (!data.descripcion || !data.descripcion.trim()) {
    toast("La descripción es obligatoria para publicar.");
    return false;
  }

  const legal = String(data.estatus_legal || "")
    .trim()
    .toLowerCase();

  if (!legal || legal === "sin revisar") {
    toast("Debes indicar el estatus legal antes de publicar.");
    return false;
  }

  /* ==========================================================
     FOTO PRINCIPAL / PORTADA
     La primera imagen se utiliza como portada.
     ========================================================== */

  const imagenesDisponibles =
    propiedadEditando
      ? editImagenes
      : nuevasImagenes;

  const tieneImagen = Array.isArray(imagenesDisponibles)
    ? imagenesDisponibles.some((item) => {
        if (!item) {
          return false;
        }

        if (typeof item === "string") {
          return item.trim() !== "";
        }

        return Boolean(
          item.file ||
          item.url ||
          item.publicUrl
        );
      })
    : false;

  if (!tieneImagen) {
    toast("Debes agregar al menos una fotografía. La primera será la portada.");
    return false;
  }

  /* ==========================================================
     VALIDACIÓN ESPECIAL PARA CASA
     No se exige para terrenos.
     ========================================================== */

  const tipo = String(data.tipo || "")
    .trim()
    .toLowerCase();

  const esCasa =
    tipo.includes("casa") ||
    tipo.includes("hacienda") ||
    tipo.includes("rancho") ||
    tipo.includes("departamento") ||
    tipo.includes("villa");

  if (esCasa) {
    const detalles =
      data.detalles &&
      typeof data.detalles === "object"
        ? data.detalles
        : {};

    const construccion = Number(data.construccion_m2);

    if (
      !Number.isFinite(construccion) ||
      construccion <= 0
    ) {
      toast("En una propiedad con casa, la construcción debe ser mayor que 0 m².");
      return false;
    }

    const recamaras = Number(detalles.recamaras);

    if (
      !Number.isFinite(recamaras) ||
      recamaras < 1
    ) {
      toast("En una propiedad con casa debes indicar las recámaras.");
      return false;
    }

    const banos = Number(detalles.banos);

    if (
      !Number.isFinite(banos) ||
      banos < 1
    ) {
      toast("En una propiedad con casa debes indicar los baños.");
      return false;
    }
  }

  return true;
}

/* ============================================================
   NUEVA PROPIEDAD
   ============================================================ */

async function saveNew() {
  const btn = document.getElementById("nbtn");

  if (btn?.disabled) {
    return;
  }

  const formData = collectPropertyForm("new");

  if (!validateProperty(formData)) {
    return;
  }

  confirmar(
    "¿Publicar propiedad?",
    "La propiedad se guardará y quedará visible según su estado.",
    async () => {
      if (btn) {
        btn.disabled = true;
      }

      const prog = document.getElementById("nprog");
      const progFill = document.getElementById("nprogf");
      const progLabel = document.getElementById("nprogl");

      try {
        if (prog) {
          prog.style.display = "block";
        }

        /* =====================================================
           IMÁGENES
           ===================================================== */

        if (progLabel) {
          progLabel.textContent = "Subiendo imágenes...";
        }

        const uploadedImages = await uploadCollection(
          nuevasImagenes,
          BUCKET_IMAGES,
          "properties",
          (value) => {
            if (progFill) {
              progFill.style.width = `${value * 0.6}%`;
            }
          },
        );

        /* =====================================================
           ARCHIVOS
           ===================================================== */

        if (progLabel) {
          progLabel.textContent = "Subiendo archivos...";
        }

        const uploadedFotosPro = await uploadCollection(
          nuevasFotosPro,
          BUCKET_IMAGES,
          "properties/pro",
        );

        const uploadedVideos = await uploadCollection(
          nuevosVideos,
          BUCKET_IMAGES,
          "properties/videos",
        );

        const uploadedVideoCover = nuevaPortadaVideo
          ? await uploadFile(BUCKET_IMAGES, nuevaPortadaVideo, "properties/video-covers")
          : null;

        const uploadedFiles = await uploadCollection(
          nuevosArchivos,
          BUCKET_FILES,
          "properties",
          (value) => {
            if (progFill) {
              progFill.style.width = `${60 + value * 0.25}%`;
            }
          },
        );

        /* =====================================================
           PAYLOAD FINAL
           ===================================================== */

        if (progLabel) {
          progLabel.textContent = "Guardando propiedad...";
        }

        const payload = {
          ...formData,

          fotos: uploadedImages
            .map((item) => (typeof item === "string" ? item : item?.url))
            .filter(Boolean),

          imagenes: uploadedImages,

          archivos: uploadedFiles,

          fotos_pro: uploadedFotosPro
            .map((item) => typeof item === "string" ? item : item?.url)
            .filter(Boolean),

          videos: uploadedVideos
            .map((item) => typeof item === "string" ? item : item?.url)
            .filter(Boolean),

          video_url:
            uploadedVideos[0]?.url ||
            uploadedVideos[0] ||
            null,

          portada_url:
            uploadedVideoCover?.url ||
            null,

          portada_tipo:
            uploadedVideoCover ? "video" : null,

          tipo_portada:
            uploadedVideoCover ? "video" : null,

          enlaces: Array.isArray(nuevosEnlaces) ? nuevosEnlaces : [],

          user_id: currentUser?.id || null,
        };

        /* =====================================================
           CREACIÓN SEGURA
           IMPORTANTE:
           NO usar .from('propiedades').insert()
           ===================================================== */

        const { data: result, error } = await s.rpc("admin_create_property", {
          p_payload: payload,
        });

        if (error) {
          throw error;
        }

        if (!result?.ok) {
          throw new Error("Supabase no confirmó la creación de la propiedad.");
        }

        /* =====================================================
           PROGRESO COMPLETO
           ===================================================== */

        if (progFill) {
          progFill.style.width = "100%";
        }

        if (progLabel) {
          progLabel.textContent = "Propiedad publicada correctamente.";
        }

        toast("Propiedad publicada correctamente.");

        /* =====================================================
           LIMPIAR FORMULARIO
           ===================================================== */

        resetNew(false);

        /* =====================================================
           RECARGAR DATOS
           ===================================================== */

        await cargarPropiedades();

        await cargarDashboard();

        goTo("propiedades");
      } catch (error) {
        console.error("[saveNew]", error);

        toast(error?.message || "No se pudo publicar la propiedad.");
      } finally {
        if (btn) {
          btn.disabled = false;
        }

        setTimeout(() => {
          if (prog) {
            prog.style.display = "none";
          }

          if (progFill) {
            progFill.style.width = "0%";
          }
        }, 500);
      }
    },
  );
}
/* ============================================================
   RESET NUEVA PROPIEDAD
   ============================================================ */

function resetNew(showToast = true) {
  nuevasImagenes = [];
  nuevosArchivos = [];
  nuevosEnlaces = [];
  nuevasFotosPro = [];
  nuevosVideos = [];
  nuevaPortadaVideo = null;

  const nf = document.getElementById("nf");

  if (nf) {
    buildNewForm();
  }

  if (showToast) {
    toast("Formulario limpiado.");
  }
}

/* ============================================================
   GUARDAR EDICIÓN
   ============================================================ */

async function saveEdit() {
  if (!propiedadEditando) {
    toast("No hay una propiedad seleccionada.");

    return;
  }

  const btn = document.getElementById("esb");

  if (btn?.disabled) {
    return;
  }

  const data = collectPropertyForm("edit");
  const oldPrice = Number(propiedadEditando?.precio_actual ?? propiedadEditando?.precio ?? 0);

  if (!validateProperty(data)) {
    return;
  }

  confirmar(
    "Guardar cambios",
    "Se actualizará la información de esta propiedad.",
    async () => {
      if (btn) {
        btn.disabled = true;
      }

      try {
        const images = await uploadCollection(
          editImagenes,
          BUCKET_IMAGES,
          `properties/${propiedadEditando.id}`,
        );

        const fotosPro = await uploadCollection(
          editFotosPro,
          BUCKET_IMAGES,
          `properties/${propiedadEditando.id}/pro`,
        );

        const videos = await uploadCollection(
          editVideos,
          BUCKET_IMAGES,
          `properties/${propiedadEditando.id}/videos`,
        );

        let videoCover = null;
        if (editPortadaVideo instanceof File) {
          videoCover = await uploadFile(
            BUCKET_IMAGES,
            editPortadaVideo,
            `properties/${propiedadEditando.id}/video-covers`,
          );
        }

        const files = await uploadCollection(
          editArchivos,
          BUCKET_FILES,
          `properties/${propiedadEditando.id}`,
        );

        const payload = {
          ...data,
          fotos: images
            .map((item) => (typeof item === "string" ? item : item?.url))
            .filter(Boolean),
          imagenes: images,

          archivos: files,

          fotos_pro: fotosPro
            .map((item) => typeof item === "string" ? item : item?.url)
            .filter(Boolean),

          videos: videos
            .map((item) => typeof item === "string" ? item : item?.url)
            .filter(Boolean),

          video_url:
            videos[0]?.url ||
            videos[0] ||
            null,

          portada_url:
            videoCover?.url ||
            (typeof editPortadaVideo === "string"
              ? editPortadaVideo
              : (
                  String(propiedadEditando?.tipo_portada || propiedadEditando?.portada_tipo || "").toLowerCase() === "video"
                    ? null
                    : (propiedadEditando?.portada_url || null)
                )),

          portada_tipo:
            (videoCover || editPortadaVideo)
              ? "video"
              : (
                  String(propiedadEditando?.tipo_portada || propiedadEditando?.portada_tipo || "").toLowerCase() === "video"
                    ? null
                    : (propiedadEditando?.portada_url ? "foto" : null)
                ),

          tipo_portada:
            (videoCover || editPortadaVideo)
              ? "video"
              : (
                  String(propiedadEditando?.tipo_portada || propiedadEditando?.portada_tipo || "").toLowerCase() === "video"
                    ? null
                    : (propiedadEditando?.portada_url ? "foto" : null)
                ),

          enlaces: editEnlaces,
        };

        const { error } = await s.rpc("admin_update_property", {
          p_property_id: propiedadEditando.id,

          p_payload: payload,
        });

        if (error) {
          throw error;
        }

        if (oldPrice > 0 && Number(data.precio_actual ?? 0) > 0 && Number(data.precio_actual) < oldPrice) {
          try {
            const { data: favorites } = await s
              .from("favoritos")
              .select("user_id")
              .eq("property_id", propiedadEditando.id);

            const userIds = [
              ...new Set([
                ...(favorites || []).map((item) => item.user_id).filter(Boolean),
                propiedadEditando.user_id,
              ].filter(Boolean)),
            ];

            if (userIds.length) {
              const { error: pushError } = await s.functions.invoke("send-notification", {
                body: {
                  titulo: "Bajó el precio de una propiedad que sigues",
                  mensaje: `"${data.titulo || propiedadEditando.titulo || "Propiedad"}" bajó de ${oldPrice.toLocaleString("es-MX")} a ${Number(data.precio_actual).toLocaleString("es-MX")}.`,
                  tipo: "precio",
                  user_ids: userIds,
                },
              });
              if (pushError) console.warn("[push precio]", pushError);
            }
          } catch (pushError) {
            console.warn("[push precio]", pushError);
          }
        }

        toast("Cambios guardados correctamente.");

        closeMod("emod");

        propiedadEditando = null;

        editImagenes = [];
        editArchivos = [];
        editEnlaces = [];
        editFotosPro = [];
        editVideos = [];
        editPortadaVideo = null;

        await cargarPropiedades();

        await cargarDashboard();

        renderPropiedades();
      } catch (error) {
        console.error("[saveEdit]", error);

        toast(error?.message || "No se pudieron guardar los cambios.");
      } finally {
        if (btn) {
          btn.disabled = false;
        }
      }
    },
  );
}

/* ============================================================
   ACTIVAR / DESACTIVAR PROPIEDAD
   ============================================================ */

async function activarPropiedad(id) {
  const p = propiedades.find((item) => String(item.id) === String(id));

  if (!p) {
    toast("No se encontró la propiedad.");

    return;
  }

  confirmar(
    "¿Activar propiedad?",
    `"${getPropTitle(p)}" volverá a estar visible públicamente.`,
    async () => {
      try {
        const { error } = await s.rpc("admin_activate_property", {
          p_property_id: id,
        });

        if (error) {
          throw error;
        }

        toast("Propiedad activada correctamente.");

        await cargarPropiedades();
        await cargarDashboard();

        renderPropiedades();
      } catch (error) {
        console.error("[activar propiedad]", error);

        toast(error?.message || "No se pudo activar la propiedad.");
      }
    },
  );
}

async function desactivarPropiedad(id) {
  const p = propiedades.find((item) => String(item.id) === String(id));

  if (!p) {
    toast("No se encontró la propiedad.");

    return;
  }

  confirmar(
    "¿Desactivar propiedad?",
    `"${getPropTitle(p)}" dejará de aparecer públicamente.`,
    async () => {
      try {
        const { error } = await s.rpc("admin_deactivate_property", {
          p_property_id: id,
        });

        if (error) {
          throw error;
        }

        toast("Propiedad desactivada correctamente.");

        await cargarPropiedades();
        await cargarDashboard();

        renderPropiedades();
      } catch (error) {
        console.error("[desactivar propiedad]", error);

        toast(error?.message || "No se pudo desactivar la propiedad.");
      }
    },
  );
}

/* ============================================================
   ELIMINAR PROPIEDAD
   ============================================================ */

async function eliminarPropiedad(id) {
  const p = propiedades.find((item) => String(item.id) === String(id));

  if (!p) {
    toast("No se encontró la propiedad.");

    return;
  }

  confirmar(
    "¿Eliminar propiedad?",
    `Se eliminará "${getPropTitle(p)}". Esta acción no se puede deshacer.`,
    async () => {
      try {
        const { data: result, error } = await s.rpc("admin_delete_property", {
          p_property_id: id,
        });

        if (error) {
          throw error;
        }

        if (!result?.ok) {
          throw new Error("Supabase no confirmó la eliminación de la propiedad.");
        }

        propiedades = propiedades.filter(
          (item) => String(item.id) !== String(id),
        );

        toast("Propiedad eliminada.");

        renderPropiedades();

        await cargarDashboard();
      } catch (error) {
        console.error("[delete]", error);

        toast(error?.message || "No se pudo eliminar la propiedad.");
      }
    },
  );
}

/* ============================================================
   MODAL PENDIENTE
   ============================================================ */

async function verPendiente(id) {
  const p = pendientes.find((item) => String(item.id) === String(id));

  if (!p) {
    toast("No se encontró la solicitud.");

    return;
  }

  pendienteViendo = p;

  renderViewProperty(p, document.getElementById("vf"));

  const subtitle = document.getElementById("vmsub");

  if (subtitle) {
    subtitle.textContent = getPropTitle(p);
  }

  const approveButton = document.getElementById("vap");

  const deleteButton = document.getElementById("vdel");

  if (approveButton) {
    approveButton.style.display = "inline-block";
  }

  if (deleteButton) {
    deleteButton.style.display = "inline-block";
  }

  openMod("vmod");
}


/* ============================================================
   PROMOCIÓN SEGURA DE MEDIOS DE SOLICITUD
   ============================================================ */

/**
 * Antes de aprobar una solicitud, todos los medios que vienen
 * de eyesite-staging deben pasar a eyesite-media.
 *
 * La Edge Function es deliberadamente separada de la RPC de
 * aprobación: si algún medio falla, NO aprobamos la solicitud.
 */
async function promoverMediosSolicitud(requestId) {
  const { data, error } = await s.functions.invoke(
    "promote-submission-media",
    {
      body: {
        request_id: requestId,
      },
    },
  );

  if (error) {
    console.error("[media promotion] invoke error", error);
    throw new Error(
      error?.message ||
      "No se pudieron promover los medios de la solicitud.",
    );
  }

  if (!data?.promotion_complete) {
    console.error("[media promotion] incomplete", data);

    const details = Array.isArray(data?.errors)
      ? data.errors
          .map((item) => {
            const field = item?.field
              ? `${item.field}: `
              : "";
            return `${field}${item?.error || item?.code || "error desconocido"}`;
          })
          .join(" | ")
      : "";

    throw new Error(
      details
        ? `No se puede aprobar la solicitud porque sus medios no quedaron publicados: ${details}`
        : "No se puede aprobar la solicitud porque sus medios no quedaron publicados.",
    );
  }

  return Array.isArray(data?.public_media)
    ? data.public_media
    : [];
}

function mediaPublicUrls(publicMedia, fieldPrefix) {
  return publicMedia
    .filter(
      (item) =>
        String(item?.field || "").startsWith(fieldPrefix) &&
        typeof item?.publicUrl === "string" &&
        item.publicUrl.trim() !== "",
    )
    .map((item) => item.publicUrl.trim());
}

function firstMediaPublicUrl(publicMedia, field) {
  const item = publicMedia.find(
    (entry) =>
      entry?.field === field &&
      typeof entry?.publicUrl === "string" &&
      entry.publicUrl.trim() !== "",
  );

  return item?.publicUrl?.trim() || null;
}

/* ============================================================
   APROBAR PENDIENTE
   ============================================================ */

async function aprobarDirecto(id) {
  const p = pendientes.find((item) => String(item.id) === String(id));

  if (!p) {
    toast("Solicitud no encontrada.");

    return;
  }

  confirmar(
    "¿Aprobar propiedad?",
    `"${getPropTitle(p)}" será aprobada y publicada.`,
    async () => {
      await cambiarEstadoPendiente(id, "aprobado");
    },
  );
}

async function aprobarPend() {
  if (!pendienteViendo) {
    toast("No hay solicitud seleccionada.");

    return;
  }

  const id = pendienteViendo.id;

  confirmar(
    "¿Aprobar propiedad?",
    "La propiedad será aprobada y publicada.",
    async () => {
      await cambiarEstadoPendiente(id, "aprobado");
    },
  );
}

async function cambiarEstadoPendiente(id, estado) {
  try {
    if (estado === "aprobado") {
      const solicitud = pendientes.find(
        (item) => String(item.id) === String(id),
      );

      if (!solicitud) {
        throw new Error("Solicitud no encontrada.");
      }

      const fotos = normalizeArray(solicitud.fotos || solicitud.imagenes || [])
        .map((item) => {
          if (typeof item === "string") {
            return item;
          }

          return item?.url || item?.publicUrl || "";
        })
        .filter(Boolean);

      const fotosPro = normalizeArray(
        solicitud.fotos_pro || solicitud.imagenes_pro || [],
      )
        .map((item) => {
          if (typeof item === "string") {
            return item;
          }

          return item?.url || item?.publicUrl || "";
        })
        .filter(Boolean);

      /*
       * PASO 1 — Promover medios.
       *
       * Nunca aprobamos primero y copiamos después: eso dejaría
       * rutas de eyesite-staging almacenadas en propiedades.
       */
      const publicMedia = await promoverMediosSolicitud(id);

      const publicFotos = mediaPublicUrls(
        publicMedia,
        "fotos[",
      );

      const publicFotosPro = mediaPublicUrls(
        publicMedia,
        "fotos_pro[",
      );

      const publicVideos = mediaPublicUrls(
        publicMedia,
        "videos[",
      );

      const publicVideoUrl =
        firstMediaPublicUrl(
          publicMedia,
          "video_url",
        ) ||
        publicVideos[0] ||
        null;

      const publicPortadaUrl =
        firstMediaPublicUrl(
          publicMedia,
          "portada_url",
        ) ||
        publicFotos[0] ||
        null;

      /*
       * PASO 2 — Crear la propiedad solamente con referencias
       * públicas definitivas.
       */
      const { data, error } = await s.rpc("admin_approve_property_request", {
        p_request_id: id,

        p_video_url: publicVideoUrl,

        p_portada_url: publicPortadaUrl,

        p_tipo_portada:
          publicVideoUrl && !publicPortadaUrl
            ? "video"
            : (solicitud.tipo_portada || null),

        p_fotos: publicFotos,

        p_fotos_pro: publicFotosPro,
      });

      if (error) {
        throw error;
      }

      console.info("[admin] solicitud aprobada con medios públicos:", {
        requestId: id,
        propertyId: data,
        media: publicMedia,
      });

      /*
       * La RPC ya crea la notificación persistente con event_key.
       * Aquí solamente enviamos el push; no insertamos otra fila.
       */
      try {
        if (solicitud.user_id) {
          const { error: pushError } = await s.functions.invoke("send-notification", {
            body: {
              titulo: "Propiedad aprobada",
              mensaje: `Tu propiedad "${solicitud.titulo || "Sin título"}" fue aprobada y publicada.`,
              tipo: "propiedad",
              user_id: solicitud.user_id,
            },
          });
          if (pushError) console.warn("[push aprobación]", pushError);
        }
      } catch (pushError) {
        console.warn("[push aprobación]", pushError);
      }
    } else if (estado === "rechazado") {
      const motivo = prompt("Motivo del rechazo:");

      if (!motivo || !motivo.trim()) {
        toast("Debes indicar el motivo del rechazo.");

        return;
      }

      const { error } = await s.rpc("admin_reject_property_request", {
        p_request_id: id,

        p_reason: motivo.trim(),
      });

      if (error) {
        throw error;
      }

      try {
        const solicitudRechazo = pendientes.find(
          (item) => String(item.id) === String(id),
        );
        if (solicitudRechazo?.user_id) {
          const { error: pushError } = await s.functions.invoke("send-notification", {
            body: {
              titulo: "Solicitud rechazada",
              mensaje: motivo.trim(),
              tipo: "solicitud",
              user_id: solicitudRechazo.user_id,
            },
          });
          if (pushError) console.warn("[push rechazo]", pushError);
        }
      } catch (pushError) {
        console.warn("[push rechazo]", pushError);
      }
    } else {
      throw new Error("Estado de solicitud no válido.");
    }

    toast(
      estado === "aprobado"
        ? "Propiedad aprobada y publicada."
        : "Solicitud rechazada.",
    );

    closeMod("vmod");

    pendienteViendo = null;

    await cargarPendientes();
    await cargarPropiedades();
    await cargarDashboard();

    renderPendientes();
    renderPropiedades();
  } catch (error) {
    console.error("[admin moderation]", error);

    toast(error?.message || "No se pudo procesar la solicitud.");
  }
}

/* ============================================================
   RECHAZAR
   ============================================================ */

async function rechazarDirecto(id) {
  const p = pendientes.find((item) => String(item.id) === String(id));

  if (!p) {
    return;
  }

  confirmar(
    "¿Rechazar solicitud?",
    `"${getPropTitle(p)}" quedará como rechazada.`,
    async () => {
      await cambiarEstadoPendiente(id, "rechazado");
    },
  );
}

/* ============================================================
   ELIMINAR PENDIENTE
   ============================================================ */

async function delPend() {
  if (!pendienteViendo) {
    toast("No hay solicitud seleccionada.");

    return;
  }

  const p = pendienteViendo;

  confirmar(
    "¿Eliminar solicitud?",
    `Se eliminará "${getPropTitle(p)}". Esta acción no se puede deshacer.`,
    async () => {
      try {
        const { data: result, error } = await s.rpc("admin_delete_property_request", {
          p_request_id: p.id,
        });

        if (error) {
          throw error;
        }

        if (!result?.ok) {
          throw new Error("Supabase no confirmó la eliminación de la solicitud.");
        }

        toast("Solicitud eliminada.");

        closeMod("vmod");

        pendienteViendo = null;

        await cargarPropiedades();

        await cargarPendientes();

        await cargarDashboard();

        renderPendientes();
      } catch (error) {
        console.error("[delete pending]", error);

        toast(error?.message || "No se pudo eliminar la solicitud.");
      }
    },
  );
}

/* ============================================================
   USUARIOS
   ============================================================ */

async function cargarUsuarios() {
  const tbody = document.getElementById("utb");

  if (!tbody) {
    console.error("[usuarios] No existe #utb");
    return;
  }

  tbody.innerHTML = emptyRow(5, "⏳", "Cargando usuarios...");

  try {
    const { data, error } = await s.rpc("admin_list_profiles");

    if (error) {
      throw error;
    }

    usuarios = Array.isArray(data) ? data : [];

    renderUsuarios();
  } catch (error) {
    console.error("[usuarios]", error);

    usuarios = [];

    tbody.innerHTML = emptyRow(
      5,
      "⚠️",
      "No se pudieron cargar los usuarios",
      error?.message || "",
    );
  }
}

/* ============================================================
   RENDER USUARIOS
   ============================================================ */

function renderUsuarios() {
  const tbody = document.getElementById("utb");

  if (!tbody) {
    return;
  }

  if (!Array.isArray(usuarios) || !usuarios.length) {
    tbody.innerHTML = emptyRow(5, "👥", "No hay usuarios registrados");

    return;
  }

  tbody.innerHTML = usuarios
    .map((usuario) => {
      const rawEstado = String(usuario.estado || usuario.status || "").toLowerCase();
      const estado = rawEstado === "sin_perfil" ? "sin_perfil" : normalizeStatus(rawEstado);

      const role = usuario.role || usuario.rol || "cliente";

      const nombre =
        usuario.nombre ||
        usuario.full_name ||
        usuario.name ||
        usuario.fullname ||
        "—";

      const email = usuario.email || "—";
      const verificacion = usuario.email_confirmed_at ? "✓ correo verificado" : "⚠ correo sin verificar";

      /*
       * IMPORTANTE:
       * El rol NO determina si el usuario está aprobado.
       * La autorización depende exclusivamente de estado.
       */

      let acciones = "";

      /* --------------------------------------------------------
       PENDIENTE
       -------------------------------------------------------- */

      if (estado === "sin_perfil") {
        acciones = `<span class="badge brj2">PERFIL INCOMPLETO</span>`;
      } else if (estado === "pendiente") {
        acciones = `
        <button
          class="bs bap2"
          onclick="aprobarUsuario('${esc(usuario.id)}')"
        >
          ✅ Aprobar
        </button>

        <button
          class="bs brj2"
          onclick="rechazarUsuario('${esc(usuario.id)}')"
        >
          ❌ Rechazar
        </button>

        <button
          class="bs"
          onclick="suspenderUsuario('${esc(usuario.id)}')"
        >
          ⏸️ Suspender
        </button>
      `;
      } else if (estado === "activa") {

      /* --------------------------------------------------------
       ACTIVA
       -------------------------------------------------------- */
        acciones = `
        <button
          class="bs"
          onclick="suspenderUsuario('${esc(usuario.id)}')"
        >
          ⏸️ Suspender
        </button>
      `;
      } else if (estado === "rechazado") {

      /* --------------------------------------------------------
       RECHAZADA
       -------------------------------------------------------- */
        acciones = `
        <button
          class="bs bap2"
          onclick="aprobarUsuario('${esc(usuario.id)}')"
        >
          ✅ Aprobar
        </button>

        <button
          class="bs"
          onclick="suspenderUsuario('${esc(usuario.id)}')"
        >
          ⏸️ Suspender
        </button>
      `;
      } else if (estado === "suspendida") {

      /* --------------------------------------------------------
       SUSPENDIDA
       -------------------------------------------------------- */
        acciones = `
        <button
          class="bs bap2"
          onclick="aprobarUsuario('${esc(usuario.id)}')"
        >
          ✅ Aprobar
        </button>
      `;
      } else {

      /* --------------------------------------------------------
       ESTADO DESCONOCIDO
       -------------------------------------------------------- */
        acciones = `
        <button
          class="bs bap2"
          onclick="aprobarUsuario('${esc(usuario.id)}')"
        >
          ✅ Aprobar
        </button>
      `;
      }

      return `
      <tr>

        <td class="p">
          ${esc(email)}
          <div class="user-verification ${usuario.email_confirmed_at ? "verified" : "unverified"}">
            ${esc(verificacion)}
          </div>
        </td>

        <td>
          ${esc(nombre)}
        </td>

        <td>
          <span class="badge bb2">
            ${esc(role)}
          </span>
        </td>

        <td>
          ${dateMX(usuario.created_at)}
        </td>

        <td>

          <div class="ab">
            ${acciones}
          </div>

        </td>

      </tr>
    `;
    })
    .join("");
}

/* ============================================================
   APROBAR USUARIO
   ============================================================ */

async function aprobarUsuario(id) {
  const usuario = usuarios.find((item) => String(item.id) === String(id));

  if (!usuario) {
    toast("Usuario no encontrado.");

    return;
  }

  confirmar(
    "¿Aprobar usuario?",
    `${usuario.email || "Este usuario"} podrá acceder a EYESITE.`,
    async () => {
      try {
        const { error } = await s.rpc("admin_approve_profile", {
          p_profile_id: id,
        });

        if (error) {
          throw error;
        }

        toast("Usuario aprobado correctamente.");

        await cargarUsuarios();
      } catch (error) {
        console.error("[aprobar usuario]", error);

        toast(error?.message || "No se pudo aprobar el usuario.");
      }
    },
  );
}

/* ============================================================
   RECHAZAR USUARIO
   ============================================================ */

async function rechazarUsuario(id) {
  const usuario = usuarios.find((item) => String(item.id) === String(id));

  if (!usuario) {
    toast("Usuario no encontrado.");

    return;
  }

  confirmar(
    "¿Rechazar usuario?",
    `${usuario.email || "Este usuario"} quedará rechazado, pero su perfil se conservará.`,
    async () => {
      try {
        const { error } = await s.rpc("admin_reject_profile", {
          p_profile_id: id,
        });

        if (error) {
          throw error;
        }

        toast("Usuario rechazado. El perfil se conserva.");

        await cargarUsuarios();
      } catch (error) {
        console.error("[rechazar usuario]", error);

        toast(error?.message || "No se pudo rechazar el usuario.");
      }
    },
  );
}

/* ============================================================
   SUSPENDER USUARIO
   ============================================================ */

async function suspenderUsuario(id) {
  const usuario = usuarios.find((item) => String(item.id) === String(id));

  if (!usuario) {
    toast("Usuario no encontrado.");

    return;
  }

  confirmar(
    "¿Suspender usuario?",
    `${usuario.email || "Este usuario"} quedará suspendido temporalmente.`,
    async () => {
      try {
        const { error } = await s.rpc("admin_suspend_profile", {
          p_profile_id: id,
        });

        if (error) {
          throw error;
        }

        toast("Usuario suspendido temporalmente.");

        await cargarUsuarios();
      } catch (error) {
        console.error("[suspender usuario]", error);

        toast(error?.message || "No se pudo suspender el usuario.");
      }
    },
  );
}

/* ============================================================
   NOTIFICACIONES Y ANUNCIOS
   ============================================================ */

function actualizarTemporizadorComunicacion() {
  const el = document.getElementById("nt_timer");
  const when = valueOf("nt_programada");
  if (!el) return;
  if (!when) {
    el.textContent = "Envío inmediato";
    return;
  }
  const target = new Date(when).getTime();
  const diff = target - Date.now();
  if (diff <= 0) {
    el.textContent = "Se enviará/publicará al procesar el próximo ciclo.";
    return;
  }
  const total = Math.floor(diff / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  el.textContent = `Programado en ${d ? d + "d " : ""}${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
}

function anuncioStoragePaths(anuncio) {
  const urls = [
    anuncio?.imagen_url,
    ...(Array.isArray(anuncio?.imagenes) ? anuncio.imagenes : []),
  ].filter(Boolean);
  return [...new Set(urls.map((url) => {
    try {
      const marker = "/storage/v1/object/public/eyesite-media/";
      const i = String(url).indexOf(marker);
      return i >= 0 ? String(url).slice(i + marker.length) : null;
    } catch (_) {
      return null;
    }
  }).filter(Boolean))];
}

async function eliminarNotificacionAdmin(id) {
  if (!confirm("¿Eliminar esta notificación? Esta acción no se puede deshacer.")) return;
  try {
    const { error } = await s.rpc("admin_delete_notification", { p_notification_id: id });
    if (error) throw error;
    toast("Notificación eliminada.");
    await cargarNotificacionesAdmin();
  } catch (e) {
    console.error("[eliminar notificación]", e);
    toast(e?.message || "No se pudo eliminar la notificación.");
  }
}

async function eliminarAnuncioAdmin(id) {
  if (!confirm("¿Eliminar este anuncio y sus imágenes? Esta acción no se puede deshacer.")) return;
  try {
    const { data: anuncio, error: readError } = await s
      .from("anuncios")
      .select("id,imagen_url,imagenes")
      .eq("id", id)
      .maybeSingle();
    if (readError) throw readError;

    const paths = anuncioStoragePaths(anuncio);
    if (paths.length) {
      const { error: storageError } = await s.storage.from(BUCKET_IMAGES).remove(paths);
      if (storageError) throw storageError;
    }

    const { error } = await s.rpc("admin_delete_announcement", { p_announcement_id: id });
    if (error) throw error;

    toast("Anuncio eliminado.");
    await cargarAnunciosAdmin();
  } catch (e) {
    console.error("[eliminar anuncio]", e);
    toast(e?.message || "No se pudo eliminar el anuncio.");
  }
}

async function cargarNotificacionesAdmin() {
  const { data, error } = await s
    .from("notificaciones")
    .select("id,user_id,titulo,mensaje,tipo,leida,created_at,programada_para,estado_envio,sent_at,push_sent_at,push_error")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[notificaciones]", error);
    return;
  }

  const b = document.getElementById("ntb");
  if (b) {
    b.innerHTML =
      (data || []).map((n) =>
        `<tr>
          <td>${dateTimeMX(n.created_at)}</td>
          <td class="p">${esc(n.titulo)}</td>
          <td>${esc(n.tipo || "info")}</td>
          <td>${n.user_id ? esc(n.user_id) : "TODOS"}</td>
          <td>${n.programada_para && new Date(n.programada_para).getTime() > Date.now() ? "PROGRAMADA" : esc(n.estado_envio || "sent")}</td>
          <td>${n.programada_para ? dateTimeMX(n.programada_para) : "-"}</td>
          <td>${n.push_sent_at ? "PUSH ✓" : (n.push_error ? "PUSH ERROR" : "-")}</td>
          <td>${esc(n.mensaje)}</td>
          <td><button class="bs" onclick="eliminarNotificacionAdmin('${esc(n.id)}')">Eliminar</button></td>
        </tr>`
      ).join("") || '<tr><td colspan="9">No hay notificaciones.</td></tr>';
  }
}

async function cargarAnunciosAdmin() {
  const { data, error } = await s
    .from("anuncios")
    .select("id,titulo,mensaje,tipo,activa,published_at,created_at,imagen_url,imagenes,enlace,enlace_label,fecha_expiracion,prioridad,programada_para,estado_publicacion,push_sent_at,push_error")
    .order("prioridad", { ascending: false })
    .order("programada_para", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[anuncios]", error);
    return;
  }

  const b = document.getElementById("anb");
  if (b) {
    b.innerHTML =
      (data || []).map((a) =>
        `<tr>
          <td>${dateTimeMX(a.programada_para || a.published_at || a.created_at)}</td>
          <td>
            ${a.imagen_url ? `<img src="${esc(a.imagen_url)}" alt="" style="width:64px;height:42px;object-fit:cover;border-radius:7px;border:1px solid var(--so2);display:block;margin-bottom:5px">` : ""}
            <span class="p">${esc(a.titulo)}</span>
          </td>
          <td>${esc(a.tipo)}</td>
          <td>${a.prioridad ?? 0}</td>
          <td>${a.estado_publicacion === "pendiente" ? "PROGRAMADO" : (a.activa ? "ACTIVO" : "INACTIVO")}</td>
          <td>${a.fecha_expiracion ? dateTimeMX(a.fecha_expiracion) : "Sin caducidad"}</td>
          <td>${a.push_sent_at ? "PUSH ✓" : (a.push_error ? "PUSH ERROR" : "-")}</td>
          <td>
            <button class="bs" onclick="cambiarEstadoAnuncio('${esc(a.id)}', ${!a.activa})">${a.activa ? "Desactivar" : "Activar"}</button>
            <button class="bs" onclick="eliminarAnuncioAdmin('${esc(a.id)}')">Eliminar</button>
          </td>
        </tr>`
      ).join("") || '<tr><td colspan="8">No hay anuncios.</td></tr>';
  }
}

async function enviarComunicacionAdmin() {
  const modo = valueOf("nt_modo") || "notification";
  const titulo = valueOf("nt_titulo").trim();
  const mensaje = valueOf("nt_mensaje").trim();
  const tipo = valueOf("nt_tipo") || "informacion";
  const destino = valueOf("nt_destino") || "all";
  const userId = valueOf("nt_user").trim();
  const enlace = valueOf("nt_enlace").trim();
  const enlaceLabel = valueOf("nt_enlace_label").trim() || "VER MÁS";
  const prioridad = Number(valueOf("nt_prioridad") || 0);
  const expira = valueOf("nt_expira").trim();
  const programada = valueOf("nt_programada").trim();
  const coverInput = document.getElementById("nt_imagen");
  const galleryInput = document.getElementById("nt_imagenes");

  if (!titulo || !mensaje) {
    toast("Título y mensaje son obligatorios.");
    return;
  }
  if (modo === "notification" && destino === "one" && !userId) {
    toast("Indica el UUID del usuario.");
    return;
  }

  const scheduledAt = programada ? new Date(programada) : new Date();
  if (Number.isNaN(scheduledAt.getTime())) {
    toast("La fecha programada no es válida.");
    return;
  }
  if (scheduledAt.getTime() < Date.now() - 5000) {
    toast("La fecha programada ya pasó.");
    return;
  }

  try {
    if (modo === "announcement") {
      const announcementId = crypto.randomUUID();
      const cover = coverInput?.files?.[0] || null;
      const gallery = galleryInput?.files ? [...galleryInput.files] : [];
      const uploadedPaths = [];

      if (cover) {
        const item = await uploadFile(BUCKET_IMAGES, cover, `announcements/${announcementId}`);
        uploadedPaths.push(item.path);
      }
      for (const file of gallery) {
        const item = await uploadFile(BUCKET_IMAGES, file, `announcements/${announcementId}`);
        uploadedPaths.push(item.path);
      }

      const imagenes = uploadedPaths
        .map((path) => s.storage.from(BUCKET_IMAGES).getPublicUrl(path).data?.publicUrl)
        .filter(Boolean);

      const isScheduled = scheduledAt.getTime() > Date.now() + 5000;
      const { error } = await s.from("anuncios").insert({
        id: announcementId,
        titulo,
        mensaje,
        tipo,
        activa: !isScheduled,
        published_at: isScheduled ? scheduledAt.toISOString() : new Date().toISOString(),
        programada_para: scheduledAt.toISOString(),
        publicada_en: isScheduled ? null : new Date().toISOString(),
        estado_publicacion: isScheduled ? "pendiente" : "publicado",
        created_by: currentUser?.id || null,
        imagen_url: imagenes[0] || null,
        imagenes,
        enlace: enlace || null,
        enlace_label: enlace ? enlaceLabel : null,
        fecha_expiracion: expira ? new Date(expira).toISOString() : null,
        prioridad: Number.isFinite(prioridad) ? prioridad : 0,
      });
      if (error) throw error;

      if (!isScheduled) {
        try {
          const { error: pushError } = await s.functions.invoke("send-notification", {
            body: { titulo, mensaje, tipo, user_id: null },
          });
          if (pushError) console.warn("[push anuncio]", pushError);
        } catch (e) {
          console.warn("[push anuncio]", e);
        }
      }

      toast(isScheduled ? "Anuncio programado." : "Anuncio publicado correctamente.");
    } else {
      let ids = [];
      if (destino === "all") {
        const { data, error } = await s.from(TABLE_PROFILES).select("id").eq("estado", "activa").neq("role", "admin");
        if (error) throw error;
        ids = (data || []).map((u) => u.id);
      } else {
        ids = [userId];
      }

      const batchId = crypto.randomUUID();
      if (ids.length) {
        const scheduledState = scheduledAt.getTime() > Date.now() + 5000 ? "pendiente" : "sent";
        const { error } = await s.from("notificaciones").insert(
          ids.map((id) => ({
            user_id: id,
            titulo,
            mensaje,
            tipo,
            leida: false,
            event_key: `admin:${batchId}:${id}`,
            programada_para: scheduledAt.toISOString(),
            estado_envio: scheduledState,
            sent_at: scheduledState === "sent" ? new Date().toISOString() : null,
          })),
        );
        if (error) throw error;
      }

      if (scheduledAt.getTime() <= Date.now() + 5000) {
        try {
          const { error: pushError } = await s.functions.invoke("send-notification", {
            body: { titulo, mensaje, tipo, user_id: destino === "one" ? userId : null },
          });
          if (pushError) console.warn("[push]", pushError);
        } catch (e) {
          console.warn("[push]", e);
        }
      }

      toast(scheduledAt.getTime() > Date.now() + 5000 ? "Notificación programada." : "Notificación enviada.");
    }

    ["nt_titulo","nt_mensaje","nt_enlace","nt_enlace_label","nt_expira","nt_programada","nt_prioridad","nt_user"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    if (coverInput) coverInput.value = "";
    if (galleryInput) galleryInput.value = "";

    await cargarNotificacionesAdmin();
    await cargarAnunciosAdmin();
  } catch (e) {
    console.error("[comunicacion]", e);
    toast(e?.message || "No se pudo guardar la comunicación.");
  }
}

async function cambiarEstadoAnuncio(id, activo) {
  try {
    const { error } = await s.from("anuncios").update({
      activa: !!activo,
      estado_publicacion: activo ? "publicado" : "cancelado",
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) throw error;
    toast(activo ? "Anuncio activado." : "Anuncio desactivado.");
    await cargarAnunciosAdmin();
  } catch (e) {
    console.error("[anuncio estado]", e);
    toast(e?.message || "No se pudo cambiar el anuncio.");
  }
}

function setupNotifications() {
  const d = document.getElementById("nt_destino");
  const w = document.getElementById("nt_user_wrap");
  const mode = document.getElementById("nt_modo");
  const type = document.getElementById("nt_tipo");
  const destinationWrap = document.getElementById("nt_destino_wrap");
  const sendButton = document.getElementById("nt_send_btn");
  const schedule = document.getElementById("nt_programada");

  if (d && w) {
    d.addEventListener("change", () => {
      w.style.display = d.value === "one" ? "block" : "none";
    });
  }
  if (mode) {
    mode.addEventListener("change", () => {
      const isAnnouncement = mode.value === "announcement";
      if (destinationWrap) destinationWrap.style.display = isAnnouncement ? "none" : "block";
      if (w) w.style.display = "none";
      if (sendButton) sendButton.textContent = isAnnouncement ? "📢 PUBLICAR ANUNCIO" : "🔔 ENVIAR NOTIFICACIÓN";
      if (type) {
        type.innerHTML = isAnnouncement
          ? '<option value="informacion">Información</option><option value="noticia">Noticia</option><option value="promocion">Promoción</option><option value="aviso">Aviso</option><option value="anuncio">Anuncio</option>'
          : '<option value="informacion">Información</option><option value="noticia">Noticia</option><option value="propiedad">Propiedad</option>';
      }
    });
  }
  if (schedule) {
    schedule.addEventListener("input", actualizarTemporizadorComunicacion);
    setInterval(actualizarTemporizadorComunicacion, 1000);
  }
  cargarNotificacionesAdmin();
  cargarAnunciosAdmin();
  s.channel("admin-live-communications")
    .on("postgres_changes", { event: "*", schema: "public", table: "notificaciones" }, cargarNotificacionesAdmin)
    .on("postgres_changes", { event: "*", schema: "public", table: "anuncios" }, cargarAnunciosAdmin)
    .subscribe();
}

/* ============================================================
   EVENTOS DE MODALES
   ============================================================ */

function setupModalEvents() {
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMod("emod");
      closeMod("vmod");
      closeCon();
    }
  });

  const cov = document.getElementById("cov");

  if (cov) {
    cov.addEventListener("click", (event) => {
      if (event.target === cov) {
        closeCon();
      }
    });
  }

  const emod = document.getElementById("emod");

  if (emod) {
    emod.addEventListener("click", (event) => {
      if (event.target === emod) {
        closeMod("emod");
      }
    });
  }

  const vmod = document.getElementById("vmod");

  if (vmod) {
    vmod.addEventListener("click", (event) => {
      if (event.target === vmod) {
        closeMod("vmod");
      }
    });
  }
}

/* ============================================================
   NAVEGACIÓN SIDEBAR
   ============================================================ */

function setupNavigation() {
  document.querySelectorAll(".ni").forEach((item) => {
    item.addEventListener("click", () => {
      goTo(item.dataset.s);
    });
  });
}

/* ============================================================
   AUTH STATE
   ============================================================ */

function setupAuthListener() {
  s.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT") {
      localStorage.removeItem("admin_2fa_ok");

      location.replace("./admin_seguro.html");
    }

    if (event === "TOKEN_REFRESHED" && session?.user) {
      currentUser = session.user;
    }
  });
}

/* ============================================================
   INICIALIZACIÓN
   ============================================================ */

async function initAdmin() {
  try {
    setupModalEvents();
    setupNavigation();

    const ok = await checkAdmin();

    if (!ok) {
      return;
    }

    setupNotifications();

    s.channel("admin-live-properties")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: TABLE_PROPERTIES,
        },
        async () => {
          await cargarPropiedades();
          await cargarDashboard();
          renderPropiedades();
        },
      )
      .subscribe();

    s.channel("admin-live-submissions")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: TABLE_SUBMISSIONS,
        },
        async () => {
          await cargarPendientes();
          await cargarDashboard();
        },
      )
      .subscribe();

    buildNewForm();

    await cargarPropiedades();

    await cargarPendientes();

    await cargarDashboard();

    goTo("dashboard");

    setupAuthListener();

    console.log("EYESITE Admin iniciado correctamente.");
  } catch (error) {
    console.error("[initAdmin]", error);

    toast(
      error?.message ||
      "No se pudo iniciar el panel."
    );
  }
}

/* ============================================================
   INICIAR
   ============================================================ */

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAdmin);
} else {
  initAdmin();
}