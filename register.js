document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registerForm");
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

  function saveUsers(users) {
    localStorage.setItem("users", JSON.stringify(users));
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    setMsg("");

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value;
    const password2 = document.getElementById("password2").value;

    if (password !== password2) {
      setMsg("Las contraseñas no coinciden.", "error");
      return;
    }

    const users = getUsers();
    const exists = users.some(u => (u.email || "").toLowerCase() === email);
    if (exists) {
      setMsg("Ese correo ya está registrado.", "error");
      return;
    }

    const newUser = { id: Date.now(), name, email, password };
    users.push(newUser);
    saveUsers(users);

    console.log("Registro:", { id: newUser.id, name: newUser.name, email: newUser.email });
    const safeUsers = users.map(({ id, name, email }) => ({ id, name, email }));
    console.log(`Usuarios registrados (total: ${safeUsers.length})`);
    console.table(safeUsers);

    sessionStorage.setItem("debugUsersAfterRegister", "1");
    sessionStorage.setItem("debugUsersData", JSON.stringify(safeUsers));
    setMsg("Registro exitoso. Ahora puedes iniciar sesión.", "ok");
    setTimeout(() => { window.location.href = "login.html"; }, 600);
  });
});
