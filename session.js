function safeJsonParse(value, fallback) {
  try { return JSON.parse(value); } catch { return fallback; }
}

function getUsers() {
  return safeJsonParse(localStorage.getItem('users'), []);
}

function setUsers(users) {
  localStorage.setItem('users', JSON.stringify(users));
}

function generateToken() {
  if (window.crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return 'tok_' + Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function startSession(user) {
  const token = generateToken();
  const safeUser = { id: user.id, name: user.name, email: user.email };
  sessionStorage.setItem('sessionToken', token);
  sessionStorage.setItem('currentUser', JSON.stringify(safeUser));
  return token;
}

function endSession() {
  sessionStorage.removeItem('sessionToken');
  sessionStorage.removeItem('currentUser');
}

function getCurrentUser() {
  return safeJsonParse(sessionStorage.getItem('currentUser'), null);
}

function hasSession() {
  return Boolean(sessionStorage.getItem('sessionToken'));
}
