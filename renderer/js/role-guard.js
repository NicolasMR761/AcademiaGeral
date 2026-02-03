// role-guard.js
(function () {
  function lockMenuForAsistencia() {
    const role = localStorage.getItem("role");
    if (role !== "asistencia") return;

    // Solo botones del navbar con data-nav
    document
      .querySelectorAll('.navbar .actions button[data-nav]')
      .forEach((btn) => {
        const nav = btn.getAttribute("data-nav");
        if (nav !== "asistencia") btn.style.display = "none";
      });
  }

  window.addEventListener("load", lockMenuForAsistencia);

  // Por si shell.js re-renderiza el menú
  const obs = new MutationObserver(lockMenuForAsistencia);
  obs.observe(document.body, { childList: true, subtree: true });
})();
