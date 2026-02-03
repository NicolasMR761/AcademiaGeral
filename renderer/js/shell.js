document.addEventListener('DOMContentLoaded', async () => {
  const s = await requireSession();
  if (!s) return;
  document.querySelectorAll('button[data-nav]').forEach(btn => btn.addEventListener('click', async () => window.api.openPage(btn.dataset.nav)));
  const out = document.getElementById('btnLogout');
  if (out) out.addEventListener('click', logout);
});
