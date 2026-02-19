document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const msg = document.getElementById("msg");

  function setMsg(text, type) {
    msg.textContent = text || "";
    msg.className = "msg" + (type ? ` ${type}` : "");
  }

  function getUsers() {
    try {
      return JSON.parse(localStorage.getItem("users") || "[]");
    } catch {
      return [];
    }
  }

  if (sessionStorage.getItem("debugUsersAfterRegister") === "1") {
    let safeUsers = null;
    try {
      safeUsers = JSON.parse(sessionStorage.getItem("debugUsersData") || "null");
    } catch {
      safeUsers = null;
    }

    if (!Array.isArray(safeUsers)) {
      const users = getUsers();
      safeUsers = users.map(({ id, name, email }) => ({ id, name, email }));
    }

    console.log(`Usuarios registrados (total: ${safeUsers.length})`);
    console.table(safeUsers);

    sessionStorage.removeItem("debugUsersAfterRegister");
    sessionStorage.removeItem("debugUsersData");
  }


  form.addEventListener("submit", (e) => {
    e.preventDefault();
    setMsg("");

    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value;

    const users = getUsers();
    const user = users.find(u => (u.email || "").toLowerCase() === email);

    if (!user || String(user.password) !== String(password)) {
      setMsg("Correo o contraseña incorrectos.", "error");
      return;
    }

    localStorage.setItem("currentUser", JSON.stringify({ id: user.id, name: user.name, email: user.email }));
    window.location.href = "index.html";
  });
});
