(function () {
  var levels = window.DAR_COURS || [];
  var params = new URLSearchParams(location.search);
  var levelId = params.get("level");
  var modId = params.get("id");

  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s || "";
    return d.innerHTML;
  }

  function list(items, ordered) {
    if (!items || !items.length) return "";
    var tag = ordered ? "ol" : "ul";
    return (
      "<" +
      tag +
      ' class="cours-list">' +
      items.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") +
      "</" +
      tag +
      ">"
    );
  }

  var level = levels.find(function (l) { return l.id === levelId; }) || levels[0];
  var mod = level && (level.modules || []).find(function (m) { return m.id === modId; });
  if (!mod && level) mod = level.modules[0];
  if (!level || !mod) {
    document.getElementById("mod-body").innerHTML = '<p class="muted">Module introuvable. <a href="./cours.html">Retour cours</a></p>';
    return;
  }

  document.getElementById("mod-title").textContent = mod.title;
  document.getElementById("mod-niv").textContent = level.niv + " · " + level.title;
  document.title = mod.title + " — Darija DZ";

  var practice = (mod.practice || [])
    .map(function (p) {
      return '<a class="btn secondary" href="' + esc(p.href) + '">' + esc(p.label) + "</a>";
    })
    .join("");

  document.getElementById("mod-body").innerHTML =
    '<section class="deck-panel">' +
    "<h2>Objectifs</h2>" +
    list(mod.goals) +
    "</section>" +
    '<section class="deck-panel">' +
    "<h2>Grammaire / formes</h2>" +
    list(mod.grammar) +
    "</section>" +
    '<section class="deck-panel">' +
    "<h2>Situations</h2>" +
    list(mod.situations) +
    "</section>" +
    '<section class="deck-panel">' +
    "<h2>Checklist (à voix haute)</h2>" +
    list(mod.checklist, true) +
    "</section>" +
    '<section class="deck-panel">' +
    "<h2>S’entraîner maintenant</h2>" +
    '<div class="btn-row">' +
    practice +
    "</div></section>" +
    '<div class="btn-row" style="margin-top:1rem">' +
    '<a class="btn secondary" href="./cours.html">Tous les cours</a>' +
    '<a class="btn secondary" href="./culture.html">Culture</a>' +
    "</div>";

  if (window.DAR) {
    DAR.touchStreak();
  }
})();
