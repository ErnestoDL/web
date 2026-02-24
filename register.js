document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registerForm");
  const msg = document.getElementById("msg");

  function setMsg(text, type) {
    msg.textContent = text || "";
    msg.className = "msg" + (type ? ` ${type}` : "");
  }

  function readUsers() {
    if (typeof getUsers === "function") return getUsers();
    try { return JSON.parse(localStorage.getItem("users") || "[]"); } catch { return []; }
  }

  function saveUsers(users) {
    if (typeof setUsers === "function") return setUsers(users);
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

    const users = readUsers();
    const exists = users.some(u => (u.email || "").toLowerCase() === email);
    if (exists) {
      setMsg("Ese correo ya está registrado.", "error");
      return;
    }

    const newUser = { id: Date.now(), name, email, password };
    users.push(newUser);
    saveUsers(users);

    const safeUsers = users.map(u => ({ id: u.id, name: u.name, email: u.email }));
    console.log("Registro:", { id: newUser.id, name: newUser.name, email: newUser.email });
    console.table(safeUsers);
    console.log("Total users:", safeUsers.length);
    setMsg("Registro exitoso. Ahora puedes iniciar sesión.", "ok");
    setTimeout(() => { window.location.href = "login.html"; }, 600);
  });
});
