document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const msg = document.getElementById("msg");

  function setMsg(text, type) {
    msg.textContent = text || "";
    msg.className = "msg" + (type ? ` ${type}` : "");
  }

  function readUsers() {
    if (typeof getUsers === "function") return getUsers();
    try { return JSON.parse(localStorage.getItem("users") || "[]"); } catch { return []; }
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    setMsg("");

    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value;

    const users = readUsers();
    const user = users.find(u => (u.email || "").toLowerCase() === email);

    if (!user || String(user.password) !== String(password)) {
      setMsg("Correo o contraseña incorrectos.", "error");
      return;
    }

    if (typeof startSession === "function") {
      startSession(user);
    } else {
      sessionStorage.setItem("sessionToken", "tok_" + Date.now());
      sessionStorage.setItem("currentUser", JSON.stringify({ id: user.id, name: user.name, email: user.email }));
    }
    window.location.href = "index.html";
  });
});
