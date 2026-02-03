let rows = [];
let profesores = [];

function setProfesorOptions(selectedId = "") {
  const sel = document.getElementById("profesor_id");
  if (!sel) return;

  const opts = ['<option value="">(Sin profesor)</option>'].concat(
    (profesores || []).map(
      (p) =>
        `<option value="${p.id}">${escapeHtml(p.nombre)} ${escapeHtml(
          p.apellido
        )}</option>`
    )
  );

  sel.innerHTML = opts.join("");
  sel.value = (selectedId ?? "") === null ? "" : String(selectedId ?? "");
}

function readForm() {
  return {
    nombre: document.getElementById("nombre").value,
    profesor_id: document.getElementById("profesor_id").value,
    dia_semana: document.getElementById("dia_semana").value,
    hora_inicio: document.getElementById("hora_inicio").value,
    hora_fin: document.getElementById("hora_fin").value,
    salon: document.getElementById("salon").value,
    estado: document.getElementById("estado").value,
  };
}

function setForm(x) {
  document.getElementById("id").value = x?.id ?? "";
  document.getElementById("nombre").value = x?.nombre ?? "";
  document.getElementById("dia_semana").value = x?.dia_semana ?? "";
 /* document.getElementById("hora_inicio").value = x?.hora_inicio ?? "";*/
  document.getElementById("hora_inicio").value = x?.hora_inicio ? String(x.hora_inicio).slice(0, 5) : "";
  /*document.getElementById("hora_fin").value = x?.hora_fin ?? "";*/
  document.getElementById("hora_fin").value = x?.hora_fin ? String(x.hora_inicio).slice(0, 5) : "";
  document.getElementById("salon").value = x?.salon ?? "";
  document.getElementById("estado").value = x?.estado ?? "activa";
  setProfesorOptions(x?.profesor_id ?? "");
}

function render() {
  const q = (document.getElementById("search").value || "")
    .trim()
    .toLowerCase();
  const body = document.getElementById("table").querySelector("tbody");

  const filtered = rows.filter((r) => {
    if (!q) return true;
    const hay = `${r.nombre || ""} ${r.profesor_nombre || ""} ${
      r.salon || ""
    } ${r.hora_inicio || ""} ${r.hora_fin || ""}`.toLowerCase();
    return hay.includes(q);
  });

  if (filtered.length === 0) {
    body.innerHTML = `<tr><td colspan="7" class="muted">Sin clases.</td></tr>`;
    return;
  }

  body.innerHTML = filtered
    .map((r, index) => {
      const horario = `${dayName(r.dia_semana)} · ${escapeHtml(
        r.hora_inicio
      )} - ${escapeHtml(r.hora_fin)}`;
      return `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(r.nombre)}</td>
        <td>${escapeHtml(r.profesor_nombre || "—")}</td>
        <td>${horario}</td>
        <td>${escapeHtml(r.salon || "—")}</td>
        <td>${escapeHtml(r.estado || "")}</td>
        <td style="white-space:nowrap;">
          <button class="btn btn-outline btn-sm" data-action="edit" data-id="${
            r.id
          }">Editar</button>
          <button class="btn btn-danger btn-sm" data-action="del" data-id="${
            r.id
          }">Eliminar</button>
        </td>
      </tr>
    `;
    })
    .join("");
}

async function refresh() {
  const res = await window.api.listClases();
  console.log("listClases res =>", res); // 👈 añade esto

  if (!res.ok)
    return showMsg("msg", "error", res.message || "Error cargando clases.");
  rows = res.clases || res.rows || [];

  render();
}

async function loadProfesores() {
  const sel = document.getElementById("profesor_id");
  if (!sel) return;

  // Placeholder visible (para saber que sí entró aquí)
  sel.innerHTML = `<option value="">Cargando profesores...</option>`;
  sel.value = "";

  // helper para normalizar cualquier respuesta
  const pickList = (res) => {
    if (!res) return [];
    return res.profesores || res.items || res.rows || res.data || [];
  };

  // 1) intenta lookup (si existe)
  try {
    const r1 = await window.api.lookupProfesores();
    if (r1 && r1.ok) {
      profesores = pickList(r1).filter(
        (p) => String(p.estado || "activo").toLowerCase() === "activo"
      );
      setProfesorOptions("");
      return;
    }
  } catch (_) {}

  // 2) fallback: listProfesores (casi siempre existe y funciona)
  try {
    const r2 = await window.api.listProfesores();
    if (r2 && r2.ok) {
      profesores = pickList(r2).filter(
        (p) => String(p.estado || "activo").toLowerCase() === "activo"
      );
      setProfesorOptions("");
      return;
    }
    showMsg(
      "msg",
      "error",
      r2 && r2.message ? r2.message : "No se pudo cargar profesores."
    );
  } catch (e) {
    showMsg("msg", "error", e.message || "No se pudo cargar profesores.");
  }

  // Si falló todo:
  profesores = [];
  sel.innerHTML = `<option value="">(Sin profesores)</option>`;
  sel.value = "";
}

async function onSubmit(e) {
  e.preventDefault();
  showMsg("msg", "", "");
  const id = document.getElementById("id").value;
  const data = readForm();

  if (id) {
    const res = await window.api.updateClase(Number(id), data);
    if (!res.ok)
      return showMsg("msg", "error", res.message || "No se pudo actualizar.");
    showMsg("msg", "success", "Actualizado.");
    setForm(null);
    return refresh();
  }

  const res = await window.api.createClase(data);
  if (!res.ok)
    return showMsg("msg", "error", res.message || "No se pudo crear.");
  showMsg("msg", "success", "Creado.");
  setForm(null);
  return refresh();
}

async function onTableClick(e) {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;

  const id = Number(btn.dataset.id);
  const action = btn.dataset.action;
  const r = rows.find((x) => x.id === id);

  if (action === "edit") {
    setForm(r);
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  if (action === "del") {
    const confirmRes = await window.api.uiConfirm(
      "Eliminar clase",
      `¿Eliminar la clase "${r?.nombre || id}"?`
    );

    if (!confirmRes?.ok)
      return showMsg(
        "msg",
        "error",
        confirmRes?.message || "Error confirmando."
      );

    if (!confirmRes.confirmed) return;

    const res = await window.api.deleteClase(id); // ✅ aquí estaba el error
    if (!res.ok)
      return showMsg("msg", "error", res.message || "No se pudo eliminar.");

    showMsg("msg", "success", "Eliminado.");
    setForm(null);

    await refresh();
    await afterUI("#nombre"); // ✅ input real que existe en el form de clases
    return;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const s = await requireSession();
  if (!s) return;

  document.getElementById("form").addEventListener("submit", onSubmit);
  document.getElementById("btnCancel").addEventListener("click", () => {
    setForm(null);
    showMsg("msg", "", "");
  });
  document.getElementById("search").addEventListener("input", render);
  document.getElementById("table").addEventListener("click", onTableClick);

  await loadProfesores();
  await refresh();
});
