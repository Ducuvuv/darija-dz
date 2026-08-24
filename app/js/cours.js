(function () {
  var levels = window.DAR_COURS || [];
  var hub = document.getElementById("cours-hub");
  if (!hub) return;

  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s || "";
    return d.innerHTML;
  }

  hub.innerHTML = levels
    .map(function (lvl) {
      var mods = (lvl.modules || [])
        .map(function (m) {
          return (
            '<a class="cours-mod-link" href="./cours-module.html?level=' +
            encodeURIComponent(lvl.id) +
            "&id=" +
            encodeURIComponent(m.id) +
            '">' +
            "<strong>" +
            esc(m.title) +
            "</strong>" +
            '<span class="muted">' +
            (m.goals && m.goals[0] ? esc(m.goals[0]) : "") +
            "</span></a>"
          );
        })
        .join("");
      return (
        '<section class="deck-panel cours-level">' +
        '<div class="cours-level-head">' +
        '<span class="pill live">' +
        esc(lvl.niv) +
        "</span>" +
        "<h2>" +
        esc(lvl.title) +
        "</h2></div>" +
        "<p>" +
        esc(lvl.blurb) +
        "</p>" +
        '<div class="cours-mod-list">' +
        mods +
        "</div></section>"
      );
    })
    .join("");
})();
