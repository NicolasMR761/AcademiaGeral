const $ = (id) => document.getElementById(id);
function escapeHtml(s) {
  return (s ?? "")
    .toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    document.getElementById("username")?.focus();
  }, 100);
});

function show(type, text) {
  const el = $("msg");
  if (!text) {
    el.innerHTML = "";
    return;
  }
  const cls = type === "success" ? "alert alert-success" : "alert alert-danger";
  el.innerHTML = `<div class="${cls}">${escapeHtml(text)}</div>`;
}
function removeTrialBanner() {
  document.getElementById("trial-banner")?.remove();
}

async function doLogin() {
  $("btnLogin").disabled = true;
  show("", "");
  const res = await window.api.login($("username").value, $("password").value);
  $("btnLogin").disabled = false;
  if (!res.ok) return show("error", res.message || "Error");
  localStorage.setItem("session", JSON.stringify(res.user));
  localStorage.setItem("role", res.user.role); // ✅ guardar rol
  localStorage.setItem("username", res.user.username); // opcional
  removeTrialBanner();

  // ✅ Redirigir según rol
  if (res.user.role === "asistencia") {
    await window.api.openPage("asistencia");
  } else {
    await window.api.openPage("dashboard");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  $("btnLogin").addEventListener("click", doLogin);
  $("password").addEventListener("keydown", (e) => {
    if (e.key === "Enter") doLogin();
  });
});

// ----- Trial banner + aviso (licencias) -----
async function initTrialUILogin() {
  // ✅ SOLO ejecutar si estamos realmente en la vista Login
  if (!document.getElementById("btnLogin")) return;

  try {
    if (!window.api || !window.api.licenseStatus) return;
    const res = await window.api.licenseStatus();
    if (!res || !res.ok || !res.status) return;

    const st = res.status;
    if (st.state !== "TRIAL") return;

    const left = Number(st.trialDaysLeft);
    const total = Number(st.trialTotalDays);
    if (Number.isNaN(left) || Number.isNaN(total)) return;

    // 👉 CREACIÓN DEL BANNER (ESTO NO SE BORRA)
    if (!document.getElementById("trial-banner")) {
      const wrap = document.createElement("div");
      wrap.id = "trial-banner";
      wrap.className = "container-fluid mt-2";
      const diasTxt = left === 1 ? "día" : "días";

      wrap.innerHTML = `
        <div class="alert alert-info d-flex align-items-center justify-content-between gap-2" role="alert">
          <div>
            <strong>TRIAL</strong> – te quedan <strong>${left}</strong> ${diasTxt} (de ${total}).
          </div>
          <div class="d-flex gap-2">
            <button id="btnTrialActivar" class="btn btn-sm btn-primary">Activar</button>
          </div>
        </div>
      `;

      document.body.insertBefore(wrap, document.body.firstChild);

      document
        .getElementById("btnTrialActivar")
        ?.addEventListener("click", () => {
          window.api.openPage("activacion");
        });
    }
  } catch (_) {
    // no romper la app
  }
}

document.addEventListener("DOMContentLoaded", initTrialUILogin);
