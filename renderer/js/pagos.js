function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

let alumnos = [];
let profesores = [];
let rows = [];

// =======================
// Dropdown buscador persona (lupa) - PAGOS
// =======================
let personas = [];

function setPersonasFromTipoPagos() {
  const tipo = document.getElementById("tipo_persona")?.value || "alumno";
  personas = (tipo === "profesor" ? profesores : alumnos) || [];
}

function filtrarPersonasPagos() {
  setPersonasFromTipoPagos();

  const searchInput = document.getElementById("personaSearch");
  const dropdown = document.getElementById("personaDropdown");
  const hiddenId = document.getElementById("persona_id");

  if (!searchInput || !dropdown || !hiddenId) return;

  const q = (searchInput.value || "").toLowerCase().trim();
  dropdown.innerHTML = "";

  // si no escribió nada, mostrar primeros 20
  const baseList = personas || [];
  const matches = (
    q
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

function cerrarDropdownPagos(e) {
  const searchInput = document.getElementById("personaSearch");
  const dropdown = document.getElementById("personaDropdown");
  if (!searchInput || !dropdown) return;

  if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
    dropdown.classList.add("d-none");
  }
}

function periodicidadLabel(p) {
  return p === "dia"
    ? "Día"
    : p === "semana"
    ? "Semana"
    : p === "mes"
    ? "Mes"
    : p;
}

function render() {
  const tbody = document.querySelector("#table tbody");
  const count = document.getElementById("count");
  const totalEl = document.getElementById("totalMonto");

  count.textContent = `${rows.length} pagos`;

  let ingresos = 0;
  let egresos = 0;
  rows.forEach((r) => {
    const m = Number(r.monto || 0);
    if (m >= 0) ingresos += m;
    else egresos += Math.abs(m);
  });

  const balance = ingresos - egresos;
  const balanceClass =
    balance > 0 ? "text-success" : balance < 0 ? "text-danger" : "text-primary";

  totalEl.innerHTML = `
  <span class="fw-bold ${balanceClass}">
    Balance: ${formatCOP(balance)}
  </span>
  &nbsp; | &nbsp;
  <span class="fw-bold text-success">
    Ingresos: ${formatCOP(ingresos)}
  </span>
  &nbsp; | &nbsp;
  <span class="fw-bold text-danger">
  Egresos: ${formatCOP(Math.abs(egresos))}
</span>

`;

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="muted">Sin pagos.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows
    .map(
      (r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(r.fecha_pago || "")}</td>
      <td>${escapeHtml(r.tipo_persona || "")}</td>
      <td>${escapeHtml(r.persona_nombre || "")}</td>
      <td>${escapeHtml(periodicidadLabel(r.periodicidad))}</td>
      <td>${formatCOP(r.monto)}</td>
      <td>${escapeHtml(r.metodo || "—")}</td>
      <td>
        <button class="btn btn-danger btn-sm" data-action="del" data-id="${
          r.id
        }">Eliminar</button>
      </td>
    </tr>
  `
    )
    .join("");
}

async function loadLookups() {
  const [ra, rp] = await Promise.all([
    window.api.lookupAlumnos(),
    window.api.lookupProfesores(),
  ]);

  if (!ra.ok)
    return showMsg("msg", "error", ra.message || "Error cargando alumnos.");
  if (!rp.ok)
    return showMsg("msg", "error", rp.message || "Error cargando profesores.");

  alumnos = ra.alumnos || [];
  profesores = rp.profesores || [];

  // ✅ inicializar lista según tipo actual
  setPersonasFromTipoPagos();
}

async function refresh() {
  const desde = document.getElementById("desde").value;
  const hasta = document.getElementById("hasta").value;

  const res = await window.api.listPagos({ desde, hasta });
  if (!res.ok)
    return showMsg("msg", "error", res.message || "Error cargando pagos.");

  rows = res.rows || [];
  render();
}

async function guardar() {
  const tipo_persona = document.getElementById("tipo_persona").value;
  const persona_id = document.getElementById("persona_id").value;
  const periodicidad = document.getElementById("periodicidad").value;
  const fecha_pago = document.getElementById("fecha_pago").value;
  const montoRaw = document.getElementById("monto").value;
  const monto = parseInt((montoRaw || "").replace(/[^\d]/g, ""), 10);
  const metodo = document.getElementById("metodo").value;
  const notas = document.getElementById("notas").value;

  if (!persona_id) return showMsg("msg", "error", "Selecciona una persona.");
  if (!fecha_pago) return showMsg("msg", "error", "Selecciona la fecha.");
  if (!Number.isFinite(monto) || monto <= 0)
    return showMsg("msg", "error", "Escribe un monto válido.");

  const res = await window.api.createPago({
    tipo_persona,
    persona_id,
    periodicidad,
    fecha_pago,
    monto, // Entero
    metodo,
    notas,
  });

  if (!res.ok)
    return showMsg("msg", "error", res.message || "No se pudo guardar.");

  showMsg("msg", "success", "Pago guardado.");

  // limpiar campos
  document.getElementById("monto").value = "";
  document.getElementById("metodo").value = "";
  document.getElementById("notas").value = "";

  // ✅ limpiar buscador persona
  const personaSearch = document.getElementById("personaSearch");
  if (personaSearch) personaSearch.value = "";
  document.getElementById("persona_id").value = "";

  await refresh();
}

async function onTableClick(e) {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;

  const action = btn.dataset.action;
  const id = Number(btn.dataset.id);

  if (action !== "del") return;

  const confirmRes = await window.api.uiConfirm(
    "Eliminar pago",
    `¿Eliminar el pago #${id}?`
  );

  if (!confirmRes?.ok)
    return showMsg("msg", "error", confirmRes?.message || "Error confirmando.");

  if (!confirmRes.confirmed) return;

  const res = await window.api.deletePago(id); // 👈 importante
  if (!res.ok)
    return showMsg("msg", "error", res.message || "No se pudo eliminar.");

  showMsg("msg", "success", "Eliminado.");

  await refresh();
  await afterUI("#monto");
}

document.addEventListener("DOMContentLoaded", async () => {
  const s = await requireSession();

  const montoEl = document.getElementById("monto");
  montoEl.addEventListener("input", () => {
    const digits = (montoEl.value || "").replace(/[^\d]/g, "");
    montoEl.value = formatCOPInputDigits(digits);
  });

  if (!s) return;

  document.getElementById("fecha_pago").value = todayISO();
  document.getElementById("desde").value = "";
  document.getElementById("hasta").value = "";

  // ✅ cambio tipo persona
  document.getElementById("tipo_persona").addEventListener("change", () => {
    setPersonasFromTipoPagos();

    // limpiar selección anterior
    const personaSearch = document.getElementById("personaSearch");
    if (personaSearch) personaSearch.value = "";
    document.getElementById("persona_id").value = "";

    // opcional: mostrar primeros 20
    filtrarPersonasPagos();
  });

  // ✅ eventos del buscador
  const personaSearch = document.getElementById("personaSearch");
  if (personaSearch) {
    personaSearch.addEventListener("focus", filtrarPersonasPagos);
    personaSearch.addEventListener("input", () => {
      // si escribe manualmente, invalida el ID previo
      const hiddenId = document.getElementById("persona_id");
      if (hiddenId) hiddenId.value = "";
      filtrarPersonasPagos();
    });
  }
  document.addEventListener("click", cerrarDropdownPagos);

  document.getElementById("btnGuardar").addEventListener("click", guardar);
  document.getElementById("btnRefrescar").addEventListener("click", refresh);
  document.getElementById("btnFiltrar").addEventListener("click", refresh);
  document.getElementById("table").addEventListener("click", onTableClick);

  await loadLookups();
  await refresh();

  // Excel
  document.getElementById("btnExcel").addEventListener("click", async () => {
    const desde = document.getElementById("desde").value;
    const hasta = document.getElementById("hasta").value;

    const res = await window.api.exportPagosExcel({ rows, desde, hasta });
    if (!res.ok) {
      return showMsg("msg", "error", res.message || "No se pudo exportar.");
    }

    showMsg("msg", "success", "Excel generado correctamente.");
  });
});

function formatCOPInputDigits(digits) {
  const n = Number(digits || 0);
  return n ? n.toLocaleString("es-CO") : "";
}
