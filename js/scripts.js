/*!
 * Start Bootstrap - SB Admin v7.0.7 (https://startbootstrap.com/template/sb-admin)
 * Copyright 2013-2023 Start Bootstrap
 * Licensed under MIT (https://github.com/StartBootstrap/startbootstrap-sb-admin/blob/master/LICENSE)
 */
//
// Scripts
//

window.addEventListener("DOMContentLoaded", (event) => {
  // Toggle the side navigation
  const sidebarToggle = document.body.querySelector("#sidebarToggle");
  if (sidebarToggle) {
    // Uncomment Below to persist sidebar toggle between refreshes
    // if (localStorage.getItem('sb|sidebar-toggle') === 'true') {
    //     document.body.classList.toggle('sb-sidenav-toggled');
    // }
    sidebarToggle.addEventListener("click", (event) => {
      event.preventDefault();
      document.body.classList.toggle("sb-sidenav-toggled");
      localStorage.setItem(
        "sb|sidebar-toggle",
        document.body.classList.contains("sb-sidenav-toggled")
      );
    });
  }
});

// Fungsi Login Sederhana (Tanpa Backend)
function handleLogin() {
  const email = document.getElementById("inputEmail").value;
  const password = document.getElementById("inputPassword").value;

  // Validasi sederhana (Bisa diubah sesuai keinginan)
  if (email && password) {
    alert("Login Berhasil! Selamat datang.");
    // Redirect ke dashboard
    window.location.href = "index.html";
  } else {
    alert("Mohon isi email dan password!");
  }
}

// Fungsi Register Sederhana
function handleRegister() {
  alert("Akun berhasil dibuat! Silahkan login.");
  window.location.href = "login.html";
}
