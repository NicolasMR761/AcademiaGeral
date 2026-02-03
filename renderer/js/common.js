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
function showMsg(id, type, text) {
  const el = $(id);
  if (!el) return;
  if (!text) {
    el.innerHTML = "";
    return;
  }
  const cls = type === "success" ? "alert alert-success" : "alert alert-danger";
  el.innerHTML = `<div class="${cls}">${escapeHtml(text)}</div>`;
}
function getSession() {
  try {
    return JSON.parse(localStorage.getItem("session") || "null");
  } catch {
    return null;
  }
}
async function requireSession() {
  const s = getSession();
  if (!s) {
    await window.api.openPage("login");
    return null;
  }
  const badge = document.getElementById("sessionBadge");
  if (badge) badge.textContent = `Usuario: ${s.username} (${s.role})`;
  return s;
}
async function logout() {
  localStorage.removeItem("session");
  await window.api.openPage("login");
}

function dayName(n) {
  return (
    [
      "",
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado",
      "Domingo",
    ][Number(n) || 0] || ""
  );
}
function formatCOP(value) {
  const n = Number(value || 0);
  return "$" + n.toLocaleString("es-CO");
}
function restoreFocus(selector) {
  setTimeout(() => {
    cleanupModals();
    window.focus();

    if (selector) {
      const el = document.querySelector(selector);
      if (el?.focus) {
        el.focus();
        el.click?.();
        return;
      }
    }

    const first = document.querySelector(
      'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])',
    );
    if (first?.focus) {
      first.focus();
      first.click?.();
      return;
    }

    document.body.focus();
  }, 80);
}

function cleanupModals() {
  document.querySelectorAll(".modal-backdrop").forEach((b) => b.remove());
  document.body.classList.remove("modal-open");
  document.body.style.removeProperty("padding-right");

  // si quedó algún modal abierto raro, ciérralo
  document
    .querySelectorAll(".modal.show")
    .forEach((m) => m.classList.remove("show"));
}

async function confirmBox(message, title = "Confirmar") {
  // confirm estable (Electron dialog). Fallback a confirm si no existe.
  if (window.api?.uiConfirm) {
    const r = await window.api.uiConfirm(title, message);
    if (!r || !r.ok) return false;
    return !!r.confirmed;
  }
  return window.confirm(message);
}

async function afterUI(focusSelector) {
  // deja respirar el DOM y quita backdrops
  await new Promise((r) => setTimeout(r, 0));
  cleanupModals();

  // fuerza foco en Electron y luego enfoca un input
  try {
    await window.api?.uiFocus?.();
  } catch (_) {}
  restoreFocus(focusSelector);
}

// ----- Trial banner + aviso (licencias) -----
async function initTrialUI() {
  // ✅ SOLO mostrar TRIAL en login
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

    // Banner arriba de la página
    const bannerId = "trial-banner";
    if (!document.getElementById(bannerId)) {
      const wrap = document.createElement("div");
      wrap.id = bannerId;
      wrap.className = "container-fluid mt-2";
      const diasTxt = left === 1 ? "día" : "días";
      wrap.innerHTML = `
        <div class="alert alert-info d-flex align-items-center justify-content-between gap-2" role="alert">
          <div><strong>TRIAL</strong> – te quedan <strong>${left}</strong> ${diasTxt} (de ${total}).</div>
          <div class="d-flex gap-2">
            <button id="btnTrialActivar" class="btn btn-sm btn-primary">Activar</button>
          </div>
        </div>
      `;
      document.body.insertBefore(wrap, document.body.firstChild);

      const btn = document.getElementById("btnTrialActivar");
      if (btn)
        btn.addEventListener("click", async () => {
          try {
            await window.api.openPage("activacion");
          } catch (_) {}
        });
    }

    // Aviso automático cuando faltan 5 días o menos (una vez por cada valor de "left")
    if (left <= 5) {
      const key = `trial_warn_shown_${left}`;
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, "1");
        const diasTxt2 = left === 1 ? "día" : "días";
        // Alert simple para no depender de componentes extra
        window.alert(
          `Aviso: tu prueba gratis termina pronto. Te quedan ${left} ${diasTxt2}.`,
        );
      }
    }
  } catch (_) {
    // No bloquear la app si algo falla
  }
}

document.addEventListener("DOMContentLoaded", initTrialUI);
