document.addEventListener("DOMContentLoaded", function () {
  var yearNode = document.getElementById("year");
  if (yearNode) {
    yearNode.textContent = new Date().getFullYear();
  }

  var nav = document.querySelector("header nav");
  var navToggle = document.querySelector(".nav-toggle");

  if (nav && navToggle) {
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-controls", "primary-navigation");
    nav.id = "primary-navigation";

    navToggle.addEventListener("click", function () {
      var isOpen = nav.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      document.body.classList.toggle("nav-open", isOpen);
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
        document.body.classList.remove("nav-open");
      });
    });

    document.addEventListener("click", function (event) {
      if (!nav.contains(event.target) && !navToggle.contains(event.target)) {
        nav.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
        document.body.classList.remove("nav-open");
      }
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 680) {
        nav.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
        document.body.classList.remove("nav-open");
      }
    });
  }
});
