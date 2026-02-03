function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

async function loadClasesForReport() {
  const sel = document.getElementById("rep_clase");
  if (!sel) return;

  const res = await window.api.listClases();
  if (!res.ok) {
    sel.innerHTML = `<option value="">(Error cargando clases)</option>`;
    return;
  }

  const clases = res.clases || [];
  sel.innerHTML = ['<option value="">Todas</option>']
    .concat(
      clases.map(
        (c) => `<option value="${c.id}">${escapeHtml(c.nombre)}</option>`
      )
    )
    .join("");
}

function renderReport(rows) {
  const tbody = document.querySelector("#repTable tbody");
  const count = document.getElementById("repCount");

  if (count) count.textContent = `${rows.length} registros`;

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="muted">Sin resultados</td></tr>`;
    return;
  }

  tbody.innerHTML = rows
    .map(
      (r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(r.fecha || "")}</td>
      <td>${escapeHtml(r.tipo || "")}</td>
      <td>${escapeHtml(r.persona_nombre || "")}</td>
      <td>${escapeHtml(r.clase_nombre || "—")}</td>
      <td>${escapeHtml(r.hora_entrada || "")}</td>
      <td>${escapeHtml(r.hora_salida || "—")}</td>
    </tr>
  `
    )
    .join("");
}

async function runReport() {
  const desde = document.getElementById("rep_desde")?.value;
  const hasta = document.getElementById("rep_hasta")?.value;
  const tipo = document.getElementById("rep_tipo")?.value || "";
  const clase_id = document.getElementById("rep_clase")?.value || "";

  if (!desde || !hasta) {
    return showMsg("msg", "error", "Selecciona fecha inicio y fin.");
  }

  const res = await window.api.reportAsistenciaRango({
    desde,
    hasta,
    tipo,
    clase_id,
  });
  if (!res.ok) {
    return showMsg("msg", "error", res.message || "Error al generar reporte.");
  }

  showMsg("msg", "", "");
  renderReport(res.rows || []);
}

document.addEventListener("DOMContentLoaded", async () => {
  const s = await requireSession();
  if (!s) return;

  // Defaults: hoy
  const t = todayISO();
  const desdeEl = document.getElementById("rep_desde");
  const hastaEl = document.getElementById("rep_hasta");
  if (desdeEl) desdeEl.value = t;
  if (hastaEl) hastaEl.value = t;

  // Eventos
  document.getElementById("btnRep")?.addEventListener("click", runReport);
  document.getElementById("btnRepHoy")?.addEventListener("click", async () => {
    const t = todayISO();
    if (desdeEl) desdeEl.value = t;
    if (hastaEl) hastaEl.value = t;
    await runReport();
  });

  // Cargar clases y correr primer reporte
  await loadClasesForReport();
  await runReport();

  // ✅ Exportar reporte de asistencia a Excel
  document
    .getElementById("btnRepExcel")
    ?.addEventListener("click", async () => {
      const desde = document.getElementById("rep_desde")?.value;
      const hasta = document.getElementById("rep_hasta")?.value;
      const tipo = document.getElementById("rep_tipo")?.value || "";
      const clase_id = document.getElementById("rep_clase")?.value || "";

      if (!desde || !hasta) {
        return showMsg("msg", "error", "Selecciona fecha inicio y fin.");
      }

      const res = await window.api.exportAsistenciaExcel({
        desde,
        hasta,
        tipo,
        clase_id,
      });

      if (!res.ok) {
        return showMsg("msg", "error", res.message || "No se pudo exportar.");
      }

      showMsg("msg", "success", "Excel generado correctamente.");
    });
});
