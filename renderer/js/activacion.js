function alertBox(type, text) {
  const msg = document.getElementById("msg");
  msg.innerHTML = `
    <div class="alert alert-${type} py-2" role="alert">${text}</div>
  `;
}

async function loadStatus() {
  const m = await window.api.licenseMachine();
  if (m?.ok) {
    document.getElementById("machineId").value = m.machineId;
  }

  const r = await window.api.licenseStatus();
  if (!r?.ok) {
    alertBox("danger", r?.message || "Error consultando licencia");
    return;
  }

  const st = r.status;
  const hint = document.getElementById("statusHint");

  if (st.state === "TRIAL") {
    hint.textContent = `Prueba gratis: quedan ${st.trialDaysLeft} día(s) de ${st.trialTotalDays}.`;
    alertBox(
      "info",
      `Modo prueba. Te quedan <b>${st.trialDaysLeft}</b> día(s). Si quieres activar por meses, pega tu licencia.`
    );
  } else if (st.state === "ACTIVE") {
    hint.textContent = `Licencia activa. Vence: ${new Date(st.expiresAt).toLocaleDateString()} (${st.daysLeft} día(s)).`;
    alertBox(
      "success",
      `Licencia activa hasta <b>${new Date(st.expiresAt).toLocaleString()}</b>.` 
    );
  } else {
    hint.textContent = st.expiresAt
      ? `Venció: ${new Date(st.expiresAt).toLocaleDateString()}`
      : "";
    alertBox("warning", st.message || "Necesitas activar la licencia.");
  }
}

document.getElementById("btnCopy").addEventListener("click", async () => {
  const val = document.getElementById("machineId").value;
  try {
    await navigator.clipboard.writeText(val);
    alertBox("success", "Machine ID copiado.");
  } catch {
    // fallback
    const inp = document.getElementById("machineId");
    inp.select();
    document.execCommand("copy");
    alertBox("success", "Machine ID copiado.");
  }
});

document.getElementById("btnRefresh").addEventListener("click", loadStatus);

document.getElementById("btnExit").addEventListener("click", async () => {
  window.close();
});

document.getElementById("btnActivate").addEventListener("click", async () => {
  const token = (document.getElementById("token").value || "").trim();
  if (!token) {
    alertBox("danger", "Pega la licencia (token) para activar.");
    return;
  }

  const res = await window.api.licenseActivate(token);
  if (!res?.ok) {
    alertBox("danger", res?.message || "No se pudo activar.");
    return;
  }

  const st = res.status;
  if (st?.state === "ACTIVE" || st?.state === "TRIAL") {
    alertBox(
      "success",
      `Activación correcta. Entrando a la aplicación...`
    );
    setTimeout(() => {
      window.api.openPage("login");
    }, 350);
  } else {
    alertBox("warning", st?.message || "Licencia registrada, pero no está activa.");
  }
});

loadStatus();
