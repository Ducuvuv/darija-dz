(function () {
  var TABS = [
    { id: "home", href: "./index.html", label: "Accueil", ico: "🏠" },
    { id: "flash", href: "./flashcards.html", label: "Flash", ico: "🃏" },
    { id: "qcm", href: "./qcm-player.html", label: "QCM", ico: "✓" },
    { id: "suivi", href: "./suivi.html", label: "Suivi", ico: "📊" },
  ];

  function init() {
    var inner = document.querySelector(".tabbar-inner");
    if (!inner) return;
    var tab = document.body.getAttribute("data-tab") || "home";
    inner.innerHTML = TABS.map(function (t) {
      var cls = t.id === tab ? " active" : "";
      return '<a class="' + cls.trim() + '" href="' + t.href + '"><span class="ico">' + t.ico + '</span>' + t.label + "</a>";
    }).join("");
  }

  document.addEventListener("DOMContentLoaded", init);
})();
