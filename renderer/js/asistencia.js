let clases = [];
let alumnos = [];
let profesores = [];
let rows = [];

// =======================
// Dropdown buscador persona (lupa)
// =======================
let personas = [];

function setPersonasFromTipo() {
  const tipo = document.getElementById("tipo")?.value || "alumno";
  personas = (tipo === "profesor" ? profesores : alumnos) || [];
}

function filtrarPersonas() {
  const searchInput = document.getElementById("personaSearch");
  const dropdown = document.getElementById("personaDropdown");
  const hiddenId = document.getElementById("persona_id");

  if (!searchInput || !dropdown || !hiddenId) return;

  const q = (searchInput.value || "").toLowerCase().trim();
  dropdown.innerHTML = "";

  // ✅ si no escribió nada, mostramos los primeros 20
  const baseList = personas || [];
  const matches = (q
    ? baseList.filter((p) =>
        `${p.nombre} ${p.apellido || ""}`.toLowerCase().includes(q)
      )
    : baseList
  ).slice(0, 20);

  if (!matches.length) {
    dropdown.classList.add("d-none");
    return;
  }

  matches.forEach((p) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "list-group-item list-group-item-action";
    item.textContent = `${p.nombre} ${p.apellido || ""}`.trim();

    item.onclick = () => {
      searchInput.value = item.textContent;
      hiddenId.value = p.id;
      dropdown.classList.add("d-none");
    };

    dropdown.appendChild(item);
  });

  dropdown.classList.remove("d-none");
}


function cerrarDropdown(e) {
  const searchInput = document.getElementById("personaSearch");
  const dropdown = document.getElementById("personaDropdown");
  if (!searchInput || !dropdown) return;

  if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
    dropdown.classList.add("d-none");
  }
}

// =======================
// Select clases
// =======================
function setClaseOptions() {
  const sel = document.getElementById("clase_id");
  if (!sel) return;

  const opts = ['<option value="">(Sin clase)</option>'].concat(
    clases.map((c) => {
      const label = `${escapeHtml(c.nombre)} · ${dayName(
        c.dia_semana
      )} ${escapeHtml(c.hora_inicio)}-${escapeHtml(c.hora_fin)}`;
      return `<option value="${c.id}">${label}</option>`;
    })
  );
  sel.innerHTML = opts.join("");
}

// =======================
// Load lookups
// =======================
async function loadLookups() {
  const [rc, ra, rp] = await Promise.all([
    window.api.listClases(),
    window.api.lookupAlumnos(),
    window.api.lookupProfesores(),
  ]);

  if (!rc.ok)
    return showMsg("msg", "error", rc.message || "Error cargando clases.");
  if (!ra.ok)
    return showMsg("msg", "error", ra.message || "Error cargando alumnos.");
  if (!rp.ok)
    return showMsg("msg", "error", rp.message || "Error cargando profesores.");

  clases = rc.clases || [];
  alumnos = ra.alumnos || [];
  profesores = rp.profesores || [];

  setClaseOptions();
  setPersonasFromTipo(); // 👈 llena dataset según tipo actual
}

// =======================
// Render tabla
// =======================
function render() {
  const body = document.getElementById("table")?.querySelector("tbody");
  if (!body) return;

  if (rows.length === 0) {
    body.innerHTML = `<tr><td colspan="8" class="muted">Sin registros.</td></tr>`;
    return;
  }

  body.innerHTML = rows
    .map(
      (r, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(r.persona_nombre || "—")}</td>
      <td>${escapeHtml(r.tipo || "")}</td>
      <td>${escapeHtml(r.clase_nombre || "—")}</td>
      <td>${escapeHtml(r.fecha || "")}</td>
      <td>${escapeHtml(r.hora_entrada || "")}</td>
      <td>${escapeHtml(r.hora_salida || "—")}</td>
      <td style="white-space:nowrap;">
        ${
          r.hora_salida
            ? ""
            : `<button class="btn btn-success btn-sm" data-action="out" data-id="${r.id}">Salida</button>`
        }
        <button class="btn btn-danger btn-sm" data-action="del" data-id="${
          r.id
        }">Eliminar</button>
      </td>
    </tr>
  `
    )
    .join("");
}

// =======================
// Refresh
// =======================
async function refresh() {
  const fecha = document.getElementById("fecha")?.value || "";
  const clase_id = document.getElementById("clase_id")?.value || "";
  const tipo = document.getElementById("tipo")?.value || "alumno";

  const res = await window.api.listAsistencia({ fecha, clase_id, tipo });
  if (!res.ok)
    return showMsg("msg", "error", res.message || "Error cargando asistencia.");

  rows = res.rows || [];
  render();
}

// =======================
// Checkin
// =======================
async function doCheckin() {
  const fecha = document.getElementById("fecha")?.value || "";
  const clase_id = document.getElementById("clase_id")?.value || "";
  const tipo = document.getElementById("tipo")?.value || "alumno";

  // 👇 hidden con ID real
  const persona_id = document.getElementById("persona_id")?.value || "";

  const hora_entrada = document.getElementById("hora_entrada")?.value || "";
  const notas = document.getElementById("notas")?.value || "";

  if (!persona_id) return showMsg("msg", "error", "Selecciona una persona.");

  const res = await window.api.checkin({
    fecha,
    clase_id,
    tipo,
    persona_id,
    hora_entrada,
    notas,
  });

  if (!res.ok)
    return showMsg(
      "msg",
      "error",
      res.message || "No se pudo registrar entrada."
    );

  showMsg("msg", "success", "Entrada registrada.");

  // limpiar
  const searchInput = document.getElementById("personaSearch");
  if (searchInput) searchInput.value = "";
  const hiddenId = document.getElementById("persona_id");
  if (hiddenId) hiddenId.value = "";

  const horaInput = document.getElementById("hora_entrada");
  if (horaInput) horaInput.value = "";
  const notasInput = document.getElementById("notas");
  if (notasInput) notasInput.value = "";

  await refresh();
}

// =======================
// Table actions
// =======================
async function onTableClick(e) {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;

  const id = Number(btn.dataset.id);
  const action = btn.dataset.action;

  if (action === "out") {
    const res = await window.api.checkout({ id });
    if (!res.ok)
      return showMsg(
        "msg",
        "error",
        res.message || "No se pudo registrar salida."
      );
    showMsg("msg", "success", "Salida registrada.");
    await refresh();
    return;
  }

  if (action === "del") {
    const confirmRes = await window.api.uiConfirm(
      "Eliminar asistencia",
      `¿Eliminar el registro #${id}?`
    );

    if (!confirmRes?.ok)
      return showMsg(
        "msg",
        "error",
        confirmRes?.message || "Error confirmando."
      );

    if (!confirmRes.confirmed) return;

    const res = await window.api.deleteAsistencia(id);
    if (!res.ok)
      return showMsg("msg", "error", res.message || "No se pudo eliminar.");

    showMsg("msg", "success", "Eliminado.");
    await refresh();
    return;
  }
}

// =======================
// Init
// =======================
document.addEventListener("DOMContentLoaded", async () => {
  const s = await requireSession();
  if (!s) return;

  // listeners filtros
  document.getElementById("fecha")?.addEventListener("change", refresh);
  document.getElementById("clase_id")?.addEventListener("change", refresh);

  document.getElementById("btnRefresh")?.addEventListener("click", refresh);
  document.getElementById("btnCheckin")?.addEventListener("click", doCheckin);
  document.getElementById("table")?.addEventListener("click", onTableClick);

  document.getElementById("personaSearch")?.addEventListener("focus", () => {
  filtrarPersonas(); // ✅ abre con lista aunque esté vacío
});
document.getElementById("personaSearch")?.addEventListener("click", () => {
  filtrarPersonas();
});


  // listeners buscador
  document.getElementById("personaSearch")?.addEventListener("input", filtrarPersonas);
  document.addEventListener("click", cerrarDropdown);

  // tipo cambia dataset + limpia
  document.getElementById("tipo")?.addEventListener("change", () => {
    setPersonasFromTipo();
    const searchInput = document.getElementById("personaSearch");
    if (searchInput) searchInput.value = "";
    const hiddenId = document.getElementById("persona_id");
    if (hiddenId) hiddenId.value = "";
    refresh();
  });

  // Excel (si existe el botón)
  document
    .getElementById("btnExcelAsistencia")
    ?.addEventListener("click", async () => {
      const fecha = document.getElementById("fecha")?.value || "";
      const tipo = document.getElementById("tipo")?.value || "";
      const clase_id = document.getElementById("clase_id")?.value || "";

      const res = await window.api.exportAsistenciaExcel({
        desde: fecha,
        hasta: fecha,
        tipo,
        clase_id,
      });

      if (!res?.ok)
        return showMsg("msg", "error", res?.message || "No se pudo exportar.");

      showMsg("msg", "success", "Excel generado correctamente.");
    });

  // cargar data
  await loadLookups();
  await refresh();
});
