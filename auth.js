(function () {
  const token = sessionStorage.getItem('sessionToken');
  const user = sessionStorage.getItem('currentUser');
  if (!token || !user) {
    window.location.replace('login.html');
  }
})();
