(function () {
  var C = window.DAR_CULTURE;
  if (!C) return;

  var params = new URLSearchParams(location.search);
  var tab = params.get("tab") || "villes";
  var focusId = params.get("id");

  var panels = {
    villes: document.getElementById("panel-villes"),
    figures: document.getElementById("panel-figures"),
    facts: document.getElementById("panel-facts"),
  };

  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s || "";
    return d.innerHTML;
  }

  function showTab(name) {
    tab = name;
    Object.keys(panels).forEach(function (k) {
      panels[k].hidden = k !== name;
    });
    document.querySelectorAll(".culture-tab").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-tab") === name);
    });
    try {
      history.replaceState(null, "", "./culture.html?tab=" + encodeURIComponent(name) + (focusId ? "&id=" + encodeURIComponent(focusId) : ""));
    } catch (_) {}
  }

  function renderCities() {
    panels.villes.innerHTML = (C.cities || [])
      .map(function (city) {
        var open = focusId === city.id ? " open" : "";
        var vocab = (city.vocab || [])
          .map(function (v) {
            return (
              '<li><strong>' +
              esc(v.fr) +
              '</strong> · <span class="arab">' +
              esc(v.arab) +
              '</span> · <span class="latn">' +
              esc(v.latn) +
              "</span></li>"
            );
          })
          .join("");
        return (
          '<details class="culture-card"' +
          open +
          ' id="city-' +
          esc(city.id) +
          '">' +
          "<summary><span class=\"culture-name\">" +
          esc(city.name) +
          '</span> <span class="arab culture-arab">' +
          esc(city.arab) +
          '</span></summary>' +
          '<p class="culture-nick">' +
          esc(city.nick) +
          " · " +
          esc(city.region) +
          "</p>" +
          "<p>" +
          esc(city.blurb) +
          "</p>" +
          '<p class="latn">' +
          esc(city.latn) +
          "</p>" +
          (vocab ? "<ul class=\"culture-vocab\">" + vocab + "</ul>" : "") +
          "</details>"
        );
      })
      .join("");
  }

  function renderFigures() {
    panels.figures.innerHTML = (C.figures || [])
      .map(function (f) {
        return (
          '<article class="culture-card flat">' +
          "<h3>" +
          esc(f.name) +
          ' <span class="pill">' +
          esc(f.field) +
          "</span></h3>" +
          '<p class="arab culture-arab">' +
          esc(f.arab) +
          "</p>" +
          "<p>" +
          esc(f.blurb) +
          "</p>" +
          "</article>"
        );
      })
      .join("");
  }

  function renderFacts(list) {
    document.getElementById("facts-list").innerHTML = list
      .map(function (f) {
        return (
          '<div class="fact-row">' +
          '<span class="phrase-id">' +
          esc(f.id) +
          "</span>" +
          "<p>" +
          esc(f.fr) +
          "</p>" +
          '<div class="fact-tags">' +
          (f.tags || []).map(function (t) { return '<span class="pill">' + esc(t) + "</span>"; }).join("") +
          "</div></div>"
        );
      })
      .join("");
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  var flashIdx = 0;
  var flashList = [];

  function renderFlashCard() {
    var box = document.getElementById("facts-flash");
    if (!flashList.length) {
      box.hidden = true;
      return;
    }
    var f = flashList[flashIdx];
    box.hidden = false;
    box.innerHTML =
      '<p class="flash-card-meta">' +
      (flashIdx + 1) +
      " / " +
      flashList.length +
      "</p>" +
      '<p class="fact-flash-text">' +
      esc(f.fr) +
      "</p>" +
      '<div class="btn-row">' +
      '<button type="button" class="btn secondary" id="fact-prev">‹</button>' +
      '<button type="button" class="btn" id="fact-next">Suivant</button>' +
      "</div>";
    document.getElementById("fact-prev").addEventListener("click", function () {
      flashIdx = (flashIdx - 1 + flashList.length) % flashList.length;
      renderFlashCard();
    });
    document.getElementById("fact-next").addEventListener("click", function () {
      if (flashIdx + 1 >= flashList.length) {
        if (window.DAR) {
          DAR.addXp(6, "fun facts");
          DAR.sfx.done();
        }
        box.innerHTML = '<p class="muted">Session facts terminée — nice.</p>';
        return;
      }
      flashIdx += 1;
      if (window.DAR) DAR.sfx.click();
      renderFlashCard();
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    renderCities();
    renderFigures();
    renderFacts(C.funfacts || []);

    document.querySelectorAll(".culture-tab").forEach(function (btn) {
      btn.addEventListener("click", function () {
        focusId = null;
        showTab(btn.getAttribute("data-tab"));
      });
    });

    document.getElementById("btn-facts-shuffle").addEventListener("click", function () {
      renderFacts(shuffle(C.funfacts || []));
    });
    document.getElementById("btn-facts-flash").addEventListener("click", function () {
      flashList = shuffle(C.funfacts || []).slice(0, 8);
      flashIdx = 0;
      showTab("facts");
      renderFlashCard();
      document.getElementById("facts-flash").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    showTab(tab === "figures" || tab === "facts" ? tab : "villes");
    if (focusId && tab === "villes") {
      var el = document.getElementById("city-" + focusId);
      if (el) {
        el.open = true;
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  });
})();
