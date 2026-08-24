(function () {
  var data = window.DAR_DATA;
  if (!data) return;

  var verbs = data.verbs || [];
  var elRoot = document.getElementById("verb-list");

  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s || "";
    return d.innerHTML;
  }

  function renderTable(table) {
    if (table.type === "tense") {
      var hdr = "<tr><th></th><th>Passé</th><th>Présent</th></tr>";
      var rows = table.forms
        .map(function (f) {
          return "<tr><td>" + esc(f.label) + '</td><td class="arab">' + esc(f.past) + '</td><td class="arab">' + esc(f.present) + "</td></tr>";
        })
        .join("");
      return '<table class="verb-table">' + hdr + rows + "</table>";
    }
    var hdr2 = "<tr><th>FR</th><th>arabe</th><th>latn</th></tr>";
    var rows2 = table.forms
      .map(function (f) {
        return "<tr><td>" + esc(f.fr) + '</td><td class="arab">' + esc(f.arab) + '</td><td class="latn">' + esc(f.latn) + "</td></tr>";
      })
      .join("");
    return '<table class="verb-table">' + hdr2 + rows2 + "</table>";
  }

  function render() {
    elRoot.innerHTML = verbs
      .map(function (v) {
        var tables = (v.tables || []).map(renderTable).join("");
        return (
          '<section class="deck-panel verb-block" id="' + esc(v.id) + '">' +
          '<h3><span class="verb-num">' + v.num + ".</span> " + esc(v.title) + ' <span class="arab verb-head">' + esc(v.arab) + "</span></h3>" +
          tables +
          '<a class="btn secondary btn-sm" href="./conjugaison.html">Conjugaison complète</a> ' +
          '<a class="btn secondary btn-sm" href="./flashcards.html?deck=02-deck-7">Verbes en flash</a>' +
          "</section>"
        );
      })
      .join("");
  }

  document.addEventListener("DOMContentLoaded", render);
})();
