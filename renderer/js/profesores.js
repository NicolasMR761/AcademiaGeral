const LIST = async () => {
  const res = await window.api.listProfesores();
  return { ok: res.ok, message: res.message, items: res.profesores || [] };
};
const CREATE = (p) => window.api.createProfesor(p);
const UPDATE = (id, c) => window.api.updateProfesor(id, c);
const DEL = (id) => window.api.deleteProfesor(id);
let rows = [];

function readForm() {
  return {
    nombre: document.getElementById("nombre").value,
    apellido: document.getElementById("apellido").value,
    documento: document.getElementById("documento").value,
    telefono: document.getElementById("telefono").value,
    email: document.getElementById("email").value,
    estado: document.getElementById("estado").value,
  };
}

function setForm(x) {
  document.getElementById("id").value = x?.id ?? "";
  document.getElementById("nombre").value = x?.nombre ?? "";
  document.getElementById("apellido").value = x?.apellido ?? "";
  document.getElementById("documento").value = x?.documento ?? "";
  document.getElementById("telefono").value = x?.telefono ?? "";
  document.getElementById("email").value = x?.email ?? "";
  document.getElementById("estado").value = x?.estado ?? "activo";
}

function render() {
  const q = (document.getElementById("search").value || "")
    .trim()
    .toLowerCase();
  const body = document.getElementById("table").querySelector("tbody");

  const filtered = rows.filter((r) => {
    if (!q) return true;
    const hay = `${r.nombre || ""} ${r.apellido || ""} ${r.documento || ""} ${
      r.telefono || ""
    } ${r.email || ""}`.toLowerCase();
    return hay.includes(q);
  });

  if (filtered.length === 0) {
    body.innerHTML = `<tr><td colspan="5" class="muted">Sin registros.</td></tr>`;
    return;
  }

  body.innerHTML = filtered
    .map((r, index) => {
      const name = `${escapeHtml(r.nombre)} ${escapeHtml(r.apellido)}`;
      const contact = [
        r.documento ? `Doc: ${escapeHtml(r.documento)}` : "",
        r.telefono ? `Tel: ${escapeHtml(r.telefono)}` : "",
        r.email ? `Email: ${escapeHtml(r.email)}` : "",
      ]
        .filter(Boolean)
        .join("<br>");

      const registro = (r.created_at || "").toString().slice(0, 10);

      return `
      <tr>
        <td>${index + 1}</td>
        <td>${name}</td>
        <td>${contact || '<span class="muted">—</span>'}</td>
        <td>${escapeHtml(r.estado || "")}</td>
        <td>${escapeHtml(registro || "—")}</td>
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
  const res = await LIST();
  if (!res.ok) {
    showMsg("msg", "error", res.message || "Error cargando.");
    return;
  }
  rows = (res.items || []).slice();
  render();
}

async function onSubmit(e) {
  e.preventDefault();
  showMsg("msg", "", "");
  const id = document.getElementById("id").value;
  const data = readForm();

  if (id) {
    const res = await UPDATE(Number(id), data);
    if (!res.ok)
      return showMsg("msg", "error", res.message || "No se pudo actualizar.");
    showMsg("msg", "success", "Actualizado.");
    setForm(null);
    return refresh();
  }

  const res = await CREATE(data);
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
      "Eliminar",
      `¿Eliminar #${id}?`
    );

    if (!confirmRes?.ok)
      return showMsg(
        "msg",
        "error",
        confirmRes?.message || "Error confirmando."
      );

    if (!confirmRes.confirmed) return;

    const res = await DEL(id); // o window.api.deleteX(id)
    if (!res.ok)
      return showMsg("msg", "error", res.message || "No se pudo eliminar.");

    showMsg("msg", "success", "Eliminado.");
    setForm(null);

    await refresh();
    await afterUI("#<input_principal>");
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

  await refresh();
});
