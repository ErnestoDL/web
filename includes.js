async function loadInto(selectorId, filePath) {
  const host = document.getElementById(selectorId);
  if (!host) return;

  const res = await fetch(filePath, { cache: 'no-store' });
  if (!res.ok) throw new Error('No se pudo cargar: ' + filePath);
  host.innerHTML = await res.text();
}

function initUserArea() {
  const user = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
  const userDisplay = document.getElementById('userDisplay');
  const logoutBtn = document.getElementById('logoutBtn');

  if (user && userDisplay && logoutBtn) {
    userDisplay.hidden = false;
    logoutBtn.hidden = false;
    userDisplay.textContent = user.email;

    logoutBtn.addEventListener('click', () => {
      if (typeof endSession === 'function') endSession();
      window.location.href = 'login.html';
    });

    document.querySelectorAll('a[href="login.html"], a[href="register.html"]').forEach(a => {
      a.style.display = 'none';
    });
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await Promise.all([
      loadInto('siteHeader', 'partials/header.html'),
      loadInto('siteFooter', 'partials/footer.html'),
    ]);
    initUserArea();
  } catch (err) {
    console.error(err);
  }
});
