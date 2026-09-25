"use strict";

let crmLoaded = false;

function crmEsc(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function crmMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return "—";
  return "$" + n.toLocaleString("es-MX");
}

function crmTemperature(score) {
  const n = Number(score) || 0;
  if (n >= 80) return '<span class="badge bg2">🔥 CALIENTE</span>';
  if (n >= 60) return '<span class="badge ba2">🟠 INTERESADO</span>';
  if (n >= 30) return '<span class="badge bb2">🟡 SEGUIMIENTO</span>';
  return '<span class="badge" style="border-color:#555;color:#aaa">⚪ FRÍO</span>';
}

async function cargarCRM() {
  const tbody = document.getElementById("crm_tbody");
  const summary = document.getElementById("crm_summary");
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="10">Cargando prospectos...</td></tr>';

  const { data, error } = await s.rpc("admin_list_prospectos");

  if (error) {
    console.error("[CRM] cargar prospectos", error);
    tbody.innerHTML = '<tr><td colspan="10">No se pudieron cargar los prospectos.</td></tr>';
    if (summary) summary.textContent = error.message || "Error";
    return;
  }

  const rows = Array.isArray(data) ? data : [];
  const hot = rows.filter((p) => Number(p.score) >= 80).length;
  const warm = rows.filter((p) => Number(p.score) >= 60 && Number(p.score) < 80).length;

  if (summary) {
    summary.textContent = rows.length + " prospectos · " + hot + " calientes · " + warm + " interesados";
  }

  tbody.innerHTML = rows.map((p) => {
    const id = crmEsc(p.id);
    return `
      <tr>
        <td>
          <div class="p">${crmEsc(p.nombre || "Sin nombre")}</div>
          <div style="font-size:10px;color:var(--mu)">${crmEsc(p.email || "Sin correo")}</div>
          <div style="font-size:10px;color:var(--mu)">${crmEsc(p.telefono || "Sin teléfono")}</div>
        </td>
        <td>${crmTemperature(p.score)}<div style="margin-top:4px;font-weight:800">${Number(p.score) || 0}/100</div></td>
        <td>${crmMoney(p.presupuesto)}</td>
        <td>${crmEsc(p.zona_interes || "—")}</td>
        <td>${crmEsc(p.fuente || "app")}</td>
        <td>${Number(p.propiedades_interesadas) || 0}</td>
        <td>${Number(p.actividades) || 0}</td>
        <td>
          <select class="fsel" style="min-width:145px" data-crm-status="${id}">
            ${["nuevo","contactado","calificado","seguimiento","negociacion","vendido","perdido"].map((status) =>
              `<option value="${status}" ${p.estado === status ? "selected" : ""}>${status.toUpperCase()}</option>`
            ).join("")}
          </select>
        </td>
        <td>
          <button class="bs" data-crm-save="${id}">Guardar</button>
        </td>
      </tr>`;
  }).join("") || '<tr><td colspan="10">Todavía no hay prospectos.</td></tr>';

  tbody.querySelectorAll("[data-crm-save]").forEach((button) => {
    button.addEventListener("click", async () => {
      const id = button.getAttribute("data-crm-save");
      const status = tbody.querySelector(`[data-crm-status="${CSS.escape(id)}"]`)?.value;
      await actualizarCRM(id, status);
    });
  });
}

async function actualizarCRM(id, estado) {
  if (!id || !estado) return;

  const { error } = await s.rpc("admin_update_prospecto", {
    p_prospecto_id: id,
    p_estado: estado,
  });

  if (error) {
    console.error("[CRM] actualizar", error);
    if (typeof toast === "function") toast(error.message || "No se pudo actualizar el prospecto.");
    return;
  }

  if (typeof toast === "function") toast("Prospecto actualizado.");
  await cargarCRM();
}

function initCRM() {
  if (crmLoaded) {
    void cargarCRM();
    return;
  }
  crmLoaded = true;
  void cargarCRM();
}

window.initCRM = initCRM;
window.cargarCRM = cargarCRM;
